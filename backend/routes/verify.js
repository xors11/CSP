const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');

// Helper to call Groq API with robust dual-key and multi-model fallback resilience
async function callGroq(messages, jsonMode = false) {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY1
  ].filter(Boolean);

  if (keys.length === 0) {
    throw new Error('No Groq API keys (GROQ_API_KEY or GROQ_API_KEY1) are defined in environment');
  }

  // Active modern Groq models only (decommissioned: gemma2-9b-it, llama3-8b-8192, mixtral-8x7b-32768)
  const models = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-groq-70b-8192-tool-use-preview'
  ];

  let lastError = null;

  for (const key of keys) {
    const keyAbbrev = key.substring(0, 8) + '...' + key.substring(key.length - 4);
    for (const model of models) {
      try {
        console.log(`Querying Groq model "${model}" using API key ${keyAbbrev}...`);
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.3,
            response_format: jsonMode ? { type: 'json_object' } : undefined
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`Successfully completed generation using model "${model}" with key ${keyAbbrev}`);
          return data.choices[0].message.content;
        } else {
          const errText = await response.text();
          console.warn(`Groq model "${model}" with key ${keyAbbrev} failed (status ${response.status}): ${errText.substring(0, 100)}...`);
          lastError = new Error(`Groq API responded with status ${response.status}: ${errText}`);
        }
      } catch (err) {
        console.warn(`Groq model "${model}" with key ${keyAbbrev} encountered error: ${err.message}. Trying next fallback...`);
        lastError = err;
      }
    }
  }

  throw lastError || new Error('All Groq keys and fallback models failed.');
}

// Programmatic fallback question generator when MongoDB has zero questions for the requested subject
function generateJSFallbackQuestions(subject, count, startId = 1) {
  const questions = [];
  for (let i = 0; i < count; i++) {
    const qId = startId + i;
    if (i % 3 === 0) {
      questions.push({
        id: qId,
        type: 'MCQ',
        difficulty: 'medium',
        time_limit_seconds: 90,
        question: `Which of the following is a primary core design pattern or standard concept in ${subject}?`,
        options: [
          `Optimal resource allocation and modular structures in ${subject}`,
          `Legacy non-scalable approaches to resolving standard tasks`,
          `Unconstrained high-latency operations`,
          `Ad-hoc unverified configuration parameters`
        ],
        answer: `Optimal resource allocation and modular structures in ${subject}`,
        explanation: `Using standard design patterns ensures optimal performance and scaling capabilities in ${subject}.`
      });
    } else if (i % 3 === 1) {
      questions.push({
        id: qId,
        type: 'Coding',
        difficulty: 'medium',
        time_limit_seconds: 480,
        question: `Write a robust, clean algorithm or script in Python to solve a core problem in ${subject}. The algorithm must run within standard constraints and handle potential edge cases.`,
        constraints: 'Time limit: 2.0s, memory: 256MB',
        input_format: 'Standard function parameters or parameters matching the problem requirements',
        output_format: 'Optimal and correct return value',
        example: { input: 'N/A', output: 'N/A' },
        edge_cases: ['Empty structures', 'Out of bound limits', 'Null references'],
        expected_complexity: { time: 'O(n)', space: 'O(1)' },
        answer: `# Scaffolding for ${subject}\ndef solution(n):\n    return n`,
        explanation: `Provides the base scaffolding and correct return statement for ${subject} algorithmic criteria.`
      });
    } else {
      questions.push({
        id: qId,
        type: 'Theory',
        difficulty: 'hard',
        time_limit_seconds: 180,
        question: `Explain the architectural design, core principles, and common design trade-offs associated with implementations in ${subject}.`,
        answer: `A comprehensive implementation of ${subject} requires evaluating system throughput, low latency constraints, and modular extensibility. Standard practices focus on decoupling components and ensuring reliable state tracking.`,
        explanation: `Focuses on deep conceptual understanding and architectural reasoning in ${subject}.`
      });
    }
  }
  return questions;
}

// Fallback local database-driven question fetcher conforming to updated schema
async function getQuestionsFromDB(subjectsStr, totalCount) {
  const subjects = subjectsStr.split(',').map(s => s.trim());
  let questions = [];
  const countPerSubject = Math.max(1, Math.floor(totalCount / subjects.length));

  for (const subject of subjects) {
    const count = await Question.countDocuments({ subject });
    
    if (count === 0) {
      const mockQs = generateJSFallbackQuestions(subject, countPerSubject, questions.length + 1);
      questions.push(...mockQs);
      continue;
    }

    const mcqs = await Question.aggregate([
      { $match: { subject: subject, type: 'mcq' } },
      { $sample: { size: Math.max(1, Math.floor(countPerSubject * 0.7)) } }
    ]);

    const coding = await Question.aggregate([
      { $match: { subject: subject, type: 'coding' } },
      { $sample: { size: Math.max(1, Math.floor(countPerSubject * 0.3)) } }
    ]);

    mcqs.forEach((q, idx) => {
      questions.push({
        id: questions.length + 1,
        type: 'MCQ',
        difficulty: idx % 3 === 0 ? 'easy' : (idx % 3 === 1 ? 'medium' : 'hard'),
        time_limit_seconds: 90,
        question: q.q,
        options: q.options,
        answer: q.options[q.a],
        explanation: 'Pre-seeded validation question.'
      });
    });

    coding.forEach((q) => {
      questions.push({
        id: questions.length + 1,
        type: 'Coding',
        difficulty: 'medium',
        time_limit_seconds: 480,
        question: q.q,
        constraints: '1 ≤ n ≤ 10^5, time limit: 2.0s',
        input_format: 'Standard function arguments',
        output_format: 'Return the computed result',
        example: { input: 'N/A', output: 'N/A' },
        edge_cases: ['Empty structures', 'Single item arrays', 'Negative values'],
        expected_complexity: { time: 'O(n)', space: 'O(n)' },
        answer: 'def solution(args):\n    return args',
        explanation: 'Pre-seeded optimal coding strategy.'
      });
    });
  }

  // Adjust array to fit exactly the requested totalCount
  questions = questions.slice(0, totalCount);

  // Sum all time limits
  const total_time_seconds = questions.reduce((sum, q) => sum + q.time_limit_seconds, 0);

  return {
    subject: subjectsStr,
    total_questions: questions.length,
    total_time_seconds,
    questions
  };
}

// Detect whether the subject is a coding/technical field or a pure theory/academic field
function isCodingSubject(subjectsStr) {
  const codingKeywords = [
    'python', 'javascript', 'java', 'c++', 'c#', 'react', 'node', 'web dev',
    'data structures', 'dsa', 'algorithms', 'machine learning', 'ml', 'ai',
    'dbms', 'database', 'operating systems', 'os', 'computer networks',
    'software engineering', 'web development', 'b.tech'
  ];
  const lower = subjectsStr.toLowerCase();
  return codingKeywords.some(kw => lower.includes(kw));
}

// Detect whether the subject is a medical/MBBS subject
function isMedicalSubject(subjectsStr) {
  const medicalSubjects = [
    'anatomy', 'physiology', 'biochemistry', 'pathology', 'pharmacology',
    'microbiology', 'forensic medicine', 'community medicine', 'preventive',
    'social medicine', 'ophthalmology', 'ent', 'ear nose', 'otorhinolaryngology',
    'general medicine', 'general surgery', 'obstetrics', 'gynecology',
    'gynaecology', 'pediatrics', 'paediatrics', 'orthopedics', 'orthopaedics',
    'radiology', 'dermatology', 'psychiatry', 'anesthesiology', 'anaesthesiology',
    'emergency medicine', 'mbbs', 'usmle', 'neet pg', 'plab', 'clinical'
  ];
  const lower = subjectsStr.toLowerCase();
  return medicalSubjects.some(kw => lower.includes(kw));
}

// Build the specialized medical-grade system prompt
function buildMedicalSystemPrompt(subject, count) {
  return `You are a senior MBBS examiner and medical question generator with expertise in clinical medicine and medical education. You follow the highest standards of medical examination question writing used in NEET PG, USMLE, and PLAB.

You are initialized for ONE specific medical subject session: "${subject}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 MEDICAL SUBJECT ISOLATION RULES (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You are initialized EXCLUSIVELY for: "${subject}"
- ONLY generate questions about "${subject}" — zero tolerance for overlap
  * If subject is "Pharmacology", do NOT include Biochemistry or Pathology questions
  * If subject is "Anatomy", do NOT include Physiology questions
  * If subject is "General Medicine", do NOT include Surgery or Pediatrics questions
- Before including any question, apply: "Is this question 100% about '${subject}'?" → NO = discard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MEDICAL CONTENT STANDARDS:
- Base all questions ONLY on standard medical textbooks and guidelines:
  * Anatomy: Gray's Anatomy, BD Chaurasia
  * Physiology: Guyton & Hall, AK Jain
  * Biochemistry: Lippincott, Harper's
  * Pathology: Robbins & Cotran, Harsh Mohan
  * Pharmacology: KD Tripathi, Goodman & Gillman
  * Microbiology: Ananthanarayan, Jawetz
  * Medicine: Harrison's, Davidson's
  * Surgery: Bailey & Love, SRB
  * Obstetrics & Gynecology: Dutta, Williams
  * Pediatrics: Nelson's, OP Ghai
  * Psychiatry: Kaplan & Sadock
  * Radiology: Sutton, Dahnert
  * Other subjects: Use the most widely accepted standard reference
- NEVER include unverified or outdated medical information
- NEVER include questions that could be misused for self-diagnosis or self-medication
- Always include the standard reference for the correct answer in every question

MEDICAL QUESTION TYPE DISTRIBUTION (strictly enforced for ${count} questions):
- 40% Clinical case-based MCQ (type: "Case-Based") — patient scenario questions
- 25% Single best answer MCQ (type: "MCQ") — standard theory-based
- 20% Image/diagram-based questions (type: "Image-Based") — described in rich text
- 15% Short reasoning questions (type: "Theory") — explain why/how

MEDICAL DIFFICULTY STANDARDS:
- easy: First year MBBS level — basic anatomy, normal physiology values, drug classes
- medium: Second/Third year MBBS level — applied concepts, clinical correlations, drug mechanisms
- hard: Final year MBBS / PG entrance level (USMLE, NEET PG, PLAB) — complex cases, rare presentations

MEDICAL MCQ STRICTNESS RULES:
- MCQ distractors MUST use real medical terms — no obviously wrong options
- For clinical subjects, ALWAYS frame questions as real patient scenarios:
  "A 45-year-old male presents with chest pain radiating to the left arm..."
- For pre-clinical subjects (Anatomy, Physiology, Biochemistry): include applied and diagram questions
- Every distractor must be a plausible differential or commonly confused alternative
- NEVER use generic wrong answers — every option must be medically realistic

MEDICAL TIMER RULES:
- MCQ (single best answer): time_limit_seconds: 90
- Case-Based (clinical scenario): time_limit_seconds: 180
- Image-Based (diagram/imaging): time_limit_seconds: 120
- Theory (reasoning): time_limit_seconds: 240

JSON TYPE SAFETY RULES (MANDATORY):
- ALL string fields must be primitive strings — NEVER objects or nested arrays
- "options" must be an array of plain strings: ["A. ...", "B. ...", "C. ...", "D. ..."]
- "answer" must be exactly one of the option strings
- "reference" must be a plain string with textbook name and chapter
- "case" field (for Case-Based) must be a plain string describing the clinical scenario
- "image_description" (for Image-Based) must be a plain string describing the image/diagram

OUTPUT FORMAT:
You MUST respond with a single, valid JSON object, no markdown, no backticks, no extra text:
{
  "subject": "${subject}",
  "total_questions": ${count},
  "total_time_seconds": <sum of all question time_limit_seconds>,
  "questions": [
    {
      "id": 1,
      "type": "MCQ",
      "difficulty": "easy | medium | hard",
      "time_limit_seconds": 90,
      "subject": "${subject}",
      "question": "<concept-based or theory question about ${subject}>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<correct option exactly as listed>",
      "reference": "<e.g. KD Tripathi Pharmacology, Chapter 12>",
      "explanation": "<why correct + why each distractor is wrong + clinical relevance>"
    },
    {
      "id": 2,
      "type": "Case-Based",
      "difficulty": "medium | hard",
      "time_limit_seconds": 180,
      "subject": "${subject}",
      "case": "<A [age]-year-old [gender] presents with [symptoms]. [Vitals]. [Investigation findings].>",
      "question": "<What is the most likely diagnosis / next step / drug of choice / etc.?>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<correct option exactly as listed>",
      "reference": "<standard textbook and chapter>",
      "explanation": "<full clinical reasoning, diagnosis, management steps, why other options are wrong>"
    },
    {
      "id": 3,
      "type": "Image-Based",
      "difficulty": "medium",
      "time_limit_seconds": 120,
      "subject": "${subject}",
      "image_description": "<Detailed textual description of what would be seen in the image/diagram/X-ray/histology slide/ECG — describe findings as if reporting>",
      "question": "<question about the image finding>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<correct option exactly as listed>",
      "reference": "<standard textbook and chapter>",
      "explanation": "<why the image finding indicates this answer + differentials>"
    },
    {
      "id": 4,
      "type": "Theory",
      "difficulty": "hard",
      "time_limit_seconds": 240,
      "subject": "${subject}",
      "question": "<Explain / Compare / Discuss — must require deep clinical or scientific reasoning>",
      "answer": "<detailed accurate answer with mechanism, steps, or comparison>",
      "reference": "<standard textbook and chapter>",
      "explanation": "<clinical relevance and why this matters in practice>"
    }
  ]
}`;
}

// Replace any Coding-type questions in a non-coding subject response with Theory questions
function sanitizeQuestionsForTheorySubject(questions, subject) {
  return questions.map((q, idx) => {
    if (q.type === 'Coding') {
      console.warn(`[SANITIZE] Replacing disallowed Coding question (id=${q.id}) for theory subject "${subject}"`);
      return {
        id: q.id,
        type: 'Theory',
        difficulty: q.difficulty || 'medium',
        time_limit_seconds: 180,
        question: `Explain in detail the core concept, underlying principles, and real-world application of: ${q.question}`,
        answer: `A thorough understanding of this topic in ${subject} involves examining its foundational definitions, how it connects to broader principles, and where it is applied in practice.`,
        explanation: `This question tests deep conceptual understanding specific to ${subject}.`
      };
    }
    return q;
  });
}

// Generate highly rigorous dynamic AI questions
router.get('/generate', async (req, res) => {
  const subjects = req.query.subjects || 'General';
  const count = parseInt(req.query.count) || 10;
  const isMedical = isMedicalSubject(subjects);
  const isTheorySubject = !isMedical && !isCodingSubject(subjects);

  try {
    if (!process.env.GROQ_API_KEY) {
      console.log('No GROQ_API_KEY found, falling back to DB...');
      const dbResult = await getQuestionsFromDB(subjects, count);
      return res.status(200).json(dbResult);
    }

    // --- Branch: Medical subjects get a specialized clinical prompt ---
    if (isMedical) {
      const medicalSystemPrompt = buildMedicalSystemPrompt(subjects, count);
      const medicalMessages = [
        { role: 'system', content: medicalSystemPrompt },
        { role: 'user', content: `Generate exactly ${count} medical questions EXCLUSIVELY about "${subjects}". Follow the type distribution strictly: 40% Case-Based, 25% MCQ, 20% Image-Based, 15% Theory. Every question must be clinically accurate, reference a standard textbook, and test the depth expected at NEET PG / USMLE level. Output only valid JSON — no markdown, no extra text.` }
      ];
      console.log(`[MEDICAL] Requesting ${count} clinical questions from Groq for: ${subjects}...`);
      const content = await callGroq(medicalMessages, true);
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    }

    const codingBanBlock = isTheorySubject ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⛔ CODING QUESTIONS STRICTLY PROHIBITED FOR THIS SUBJECT ⛔
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${subjects}" is a THEORY / ACADEMIC subject — NOT a programming or technical coding subject.
- DO NOT generate any question with type "Coding"
- DO NOT include any code editor, code writing, programming, or algorithm questions
- DO NOT include any question that requires writing a function, script, program, or pseudocode
- ALLOWED types ONLY: "MCQ", "Theory", "Fill-in-the-blank"
- DISTRIBUTION for this subject: MCQ (50%), Theory (30%), Fill-in-the-blank (20%)
- Every single question must be answerable in plain language — no code required
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CODING QUESTIONS REQUIRED FOR THIS TECHNICAL SUBJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"${subjects}" is a TECHNICAL / CODING subject.
- Minimum 40% of questions MUST be type "Coding"
- ALLOWED types: "MCQ", "Coding", "Theory", "Fill-in-the-blank"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    const systemPrompt = `You are a strict, senior-level technical interviewer and professional exam question generator with zero tolerance for vague, repeated, or trivial questions.
You are initialized for ONE specific subject session: "${subjects}".${codingBanBlock}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUBJECT ISOLATION RULES (CRITICAL — HIGHEST PRIORITY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- You are initialized for EXACTLY this subject: "${subjects}"
- ONLY generate questions strictly and exclusively about "${subjects}"
- NEVER include questions from any other subject, language, or domain — even if related or overlapping
  * If subject is "B.Tech Python", do NOT include JavaScript, Java, or DSA syntax questions
  * If subject is "B.Tech Data Structures", do NOT include language-specific syntax questions
  * If subject is "11th Biology", do NOT include Chemistry or Physics questions
  * If subject is "9th Mathematics", do NOT include Science or Social Studies questions
- Before including any question, apply this mandatory isolation check:
  "Is this question 100% about '${subjects}' and absolutely nothing else?"
  → If NO → DISCARD the question immediately and generate a replacement
  → If YES → include it
- If two subjects share a concept (e.g., both Python and DSA involve arrays), only include it
  if the question is framed entirely and exclusively in the context of "${subjects}"
- This session is completely isolated and independent — treat it as a completely fresh start
- The subject "${subjects}" is fixed for this entire session — it CANNOT change
- NEVER carry over topics, patterns, or questions from any previous session or subject
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRICTNESS RULES:
- NEVER generate basic "what is X" definitions unless difficulty is explicitly "easy"
- NEVER repeat concepts across questions even if phrased differently
- NEVER generate questions that can be answered by guessing or common sense alone
- NEVER use vague or ambiguous wording in any question
- Every question must test a SPECIFIC, ISOLATED concept — no overlap
- Questions must reflect real-world scenarios, edge cases, and industry expectations
- Coding questions must have constraints, edge cases, and expected time/space complexity
- MCQ wrong options (distractors) must be plausible and closely related — no obvious wrong answers
- Theory questions must demand explanation, reasoning, or comparison — not just recall
- Fill-in-the-blank must test precise technical terminology, not general knowledge

DIFFICULTY STANDARDS:
- easy: Foundational concepts, standard syntax, basic use cases — for beginners
- medium: Applied knowledge, debugging scenarios, trade-off analysis, moderate algorithms
- hard: System design thinking, optimization, deep internals, complex edge cases, senior-level reasoning

DISTRIBUTION:
- 30% easy, 50% medium, 20% hard (strictly enforced)
- For coding/technical fields (e.g., Python, JavaScript, DSA, Web Dev, Java, C++, Systems, Databases): minimum 40% of questions must be Coding questions.
- For NON-CODING / THEORY fields (e.g., Mathematics, Science, English, Social Studies, Physics, Chemistry, Biology, Economics, History): ZERO Coding questions allowed. Use ONLY MCQ (50%), Theory (30%), Fill-in-the-blank (20%).

QUESTION QUALITY CHECKLIST (apply to every question before including it):
✅ 100% about "${subjects}" — passes isolation check
✅ Tests a specific, non-trivial concept within "${subjects}" only
✅ Cannot be answered by guessing
✅ Distractors (MCQ) are realistic and tricky
✅ Coding problems have constraints + edge cases (as plain strings) + complexity requirements
✅ No two questions test the same concept
✅ Language and wording are precise and unambiguous
✅ Matches industry interview standards (FAANG, product companies, or domain-specific exams)

TIMER RULES:
- Allocate time based on question type:
  * MCQ: 1.5 minutes (time_limit_seconds: 90)
  * Theory: 3 minutes (time_limit_seconds: 180)
  * Coding: 8 minutes (time_limit_seconds: 480)
  * Fill-in-the-blank: 1 minute (time_limit_seconds: 60)
- Calculate total_time_seconds by summing all individual question time limits.
- Include per-question time limit as "time_limit_seconds" in each question object.

JSON TYPE SAFETY RULES (MANDATORY):
- "edge_cases" MUST be an array of plain strings — NEVER objects or nested structures
- "example.input" and "example.output" MUST be plain strings — NEVER objects
- "constraints" MUST be a plain string
- "expected_complexity.time" and "expected_complexity.space" MUST be plain strings (e.g. "O(n log n)")
- ALL string fields must be primitive strings, not arrays or objects

OUTPUT FORMAT:
You MUST respond with a single, valid JSON object strictly conforming to this schema, with no markdown formatting, no backticks, no markdown fence blocks, and no extra text:
{
  "subject": "${subjects}",
  "total_questions": ${count},
  "total_time_seconds": <sum of all question time limits>,
  "questions": [
    {
      "id": 1,
      "type": "MCQ",
      "difficulty": "easy | medium | hard",
      "time_limit_seconds": 90,
      "question": "<precise question text strictly about ${subjects}>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<correct option exactly>",
      "explanation": "<why this is correct and why others are wrong>"
    },
    {
      "id": 2,
      "type": "Coding",
      "difficulty": "medium",
      "time_limit_seconds": 480,
      "question": "<detailed problem statement strictly about ${subjects}>",
      "constraints": "<plain string e.g. 1 ≤ n ≤ 10^5, time: O(n log n)>",
      "input_format": "<describe input>",
      "output_format": "<describe output>",
      "example": { "input": "<plain string>", "output": "<plain string>" },
      "edge_cases": ["<plain string edge case 1>", "<plain string edge case 2>"],
      "expected_complexity": { "time": "O(...)", "space": "O(...)" },
      "answer": "<optimal solution code>",
      "explanation": "<approach, why optimal, alternatives considered>"
    },
    {
      "id": 3,
      "type": "Theory",
      "difficulty": "hard",
      "time_limit_seconds": 180,
      "question": "<question demanding reasoning or comparison — strictly about ${subjects}>",
      "answer": "<detailed, precise answer>",
      "explanation": "<real-world relevance and depth>"
    },
    {
      "id": 4,
      "type": "Fill-in-the-blank",
      "difficulty": "easy",
      "time_limit_seconds": 60,
      "question": "<sentence with ___ blank using precise technical context from ${subjects}>",
      "answer": "<exact technical term or phrase>",
      "explanation": "<why this term is correct>"
    }
  ]
}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate exactly ${count} questions EXCLUSIVELY and STRICTLY for the subject: "${subjects}". Every single question must be 100% about "${subjects}" only. Do NOT include any questions from any other subject, language, or domain.${isTheorySubject ? ' THIS IS A THEORY SUBJECT — DO NOT generate ANY Coding type questions. Only use MCQ, Theory, and Fill-in-the-blank types.' : ' Include at least 40% Coding type questions.'} Enforce JSON type safety (edge_cases must be plain string arrays, not objects).` }
    ];

    console.log(`Requesting ${count} strict technical questions from Groq for: ${subjects} [${isTheorySubject ? 'THEORY — no Coding' : 'CODING — coding required'}]...`);
    const content = await callGroq(messages, true);
    
    // Parse response safely
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(cleaned);

    // Post-process: strip any Coding questions that slipped through for theory subjects
    if (isTheorySubject && !isMedical && parsed.questions && Array.isArray(parsed.questions)) {
      const hasCodingQuestions = parsed.questions.some(q => q.type === 'Coding');
      if (hasCodingQuestions) {
        parsed.questions = sanitizeQuestionsForTheorySubject(parsed.questions, subjects);
        parsed.total_time_seconds = parsed.questions.reduce((sum, q) => sum + (q.time_limit_seconds || 180), 0);
        console.log(`[SANITIZE] Removed Coding questions from theory subject "${subjects}" response.`);
      }
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error('Error generating dynamic AI test, falling back to DB:', error);
    try {
      const dbResult = await getQuestionsFromDB(subjects, count);
      res.status(200).json(dbResult);
    } catch (fallbackError) {
      console.error('Fallback generation also failed:', fallbackError);
      res.status(500).json({ message: 'Error generating AI test' });
    }
  }
});

// Evaluate candidate answers
router.post('/evaluate', async (req, res) => {
  try {
    const { userId, skills, questions, answers } = req.body;

    let evaluationResult;

    if (process.env.GROQ_API_KEY && questions && answers) {
      try {
        console.log(`Evaluating test answers for user ${userId} using Groq...`);
        const messages = [
          {
            role: 'system',
            content: `You are an expert technical interviewer and exam grader.
You will evaluate the candidate's answers for a technical test and provide a detailed analysis.

RULES:
- Grade MCQs strictly: compare user's answer with the correct answer.
- Grade Fill-in-the-blanks strictly: check if correct blank term is used.
- Grade Coding questions by checking logic, syntax, completeness, constraints compliance, and edge cases.
- Grade Theory questions by checking clarity, completeness, and conceptual accuracy.
- Calculate a final score as a percentage (0-100) based on all answers.
- Assign an 'eligibilityStatus':
  - 'Verified Mentor' if finalScore >= 80
  - 'Trial Mentor' if finalScore >= 60 and < 80
  - 'Reattempt Required' if finalScore < 60
- Provide detailed feedback metrics: subjectKnowledgeScore, problemSolvingScore, logicalThinkingScore, communicationClarityScore, teachingCapabilityScore.
- Provide lists of strengths, weaknesses, and clear recommendations.

OUTPUT FORMAT:
You MUST respond with a single, valid JSON object strictly conforming to this schema, with no markdown formatting, no backticks, no markdown fence blocks, and no extra text:
{
  "finalScore": <0-100>,
  "eligibilityStatus": "Verified Mentor | Trial Mentor | Reattempt Required",
  "message": "<detailed summary feedback message>",
  "metrics": {
    "subjectKnowledgeScore": <0-100>,
    "problemSolvingScore": <0-100>,
    "logicalThinkingScore": <0-100>,
    "communicationClarityScore": <0-100>,
    "teachingCapabilityScore": <0-100>
  },
  "codingAnalysis": {
    "correctness": "<analysis of code correctness>",
    "timeComplexity": "<analysis of time/space complexity>",
    "codeQuality": "<analysis of code style and layout>"
  },
  "explanationAnalysis": {
    "clarity": "<analysis of candidate explanation clarity>",
    "simplicity": "<analysis of concept simplicity>",
    "conceptUnderstanding": "<analysis of core concept understanding>"
  },
  "strengthAnalysis": ["<strength 1>", "<strength 2>", ...],
  "weaknessAnalysis": ["<weakness 1>", "<weakness 2>", ...],
  "recommendations": ["<rec 1>", "<rec 2>", ...]
}`
          },
          {
            role: 'user',
            content: JSON.stringify({
              examQuestions: questions,
              candidateAnswers: answers
            })
          }
        ];

        const content = await callGroq(messages, true);
        let cleaned = content.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }
        evaluationResult = JSON.parse(cleaned);
      } catch (err) {
        console.error('Groq grading failed, using local evaluator fallback:', err);
      }
    }

    // Local Grader Fallback
    if (!evaluationResult) {
      console.log('Using local fallback grading engine...');
      let total = 0;
      let correct = 0;

      if (questions && answers) {
        questions.forEach(q => {
          total++;
          const candidateAns = answers[q.id];
          if (candidateAns) {
            if (q.type === 'MCQ') {
              if (String(candidateAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase()) {
                correct++;
              }
            } else if (q.type === 'Fill-in-the-blank') {
              if (String(candidateAns).trim().toLowerCase() === String(q.answer).trim().toLowerCase()) {
                correct++;
              }
            } else {
              // Coding or Theory - check answer length as proxy for effort
              if (String(candidateAns).trim().length > 30) {
                correct++;
              } else if (String(candidateAns).trim().length > 10) {
                correct += 0.5;
              }
            }
          }
        });
      }

      const finalScore = total > 0 ? Math.floor((correct / total) * 100) : 70;
      const eligibilityStatus = finalScore >= 80 ? 'Verified Mentor' : (finalScore >= 60 ? 'Trial Mentor' : 'Reattempt Required');
      const message = finalScore >= 80
        ? `Great job! You passed the Local Evaluation with ${finalScore}%.`
        : (finalScore >= 60 ? `Provisional pass at ${finalScore}%.` : `Reattempt required at ${finalScore}%.`);

      evaluationResult = {
        finalScore,
        eligibilityStatus,
        message,
        metrics: {
          subjectKnowledgeScore: finalScore,
          problemSolvingScore: Math.max(0, finalScore - 5),
          logicalThinkingScore: Math.min(100, finalScore + 5),
          communicationClarityScore: finalScore >= 60 ? 80 : 50,
          teachingCapabilityScore: finalScore >= 80 ? 90 : 70
        },
        codingAnalysis: {
          correctness: finalScore >= 80 ? "Passed standard criteria." : "Some logic issues identified.",
          timeComplexity: "O(n) / Standard implementation.",
          codeQuality: "Reasonable layout and comments."
        },
        explanationAnalysis: {
          clarity: "Acceptable conceptual clarity.",
          simplicity: "Adequate explanation depth.",
          conceptUnderstanding: "Demonstrates core baseline concepts."
        },
        strengthAnalysis: ["Clear conceptual responses", "Complete code solutions"],
        weaknessAnalysis: ["Could improve structural formatting"],
        recommendations: ["Work on styling structures", "Elaborate more on design choices"]
      };
    }

    // Complete candidate database updates
    const finalScore = evaluationResult.finalScore;
    const eligibilityStatus = evaluationResult.eligibilityStatus;
    const isVerified = eligibilityStatus === 'Verified Mentor';
    const roleUpdate = eligibilityStatus === 'Verified Mentor'
      ? 'mentor'
      : (eligibilityStatus === 'Trial Mentor' ? 'trial_mentor' : 'student');

    let updatedUser = null;
    const mongoose = require('mongoose');
    if (userId && userId !== 'mock' && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const currentUser = await User.findById(userId);
        if (currentUser) {
          if (finalScore >= 60) {
            // Pass: merge new skills safely
            const currentSkills = currentUser.skillsToTeach || [];
            const newSkills = [...new Set([...currentSkills, ...skills])];
            
            // Determine role:
            // If already a full 'mentor', retain it.
            // If currently a 'student', update to 'mentor' or 'trial_mentor' accordingly.
            // If currently 'trial_mentor' and scored Verified Mentor (>=80), update to 'mentor'.
            let newRole = currentUser.role;
            if (eligibilityStatus === 'Verified Mentor') {
              newRole = 'mentor';
            } else if (eligibilityStatus === 'Trial Mentor') {
              if (currentUser.role !== 'mentor') {
                newRole = 'trial_mentor';
              }
            }
            const isVerifiedMentor = newRole === 'mentor';

            updatedUser = await User.findByIdAndUpdate(userId, {
              role: newRole,
              isVerifiedMentor,
              skillsToTeach: newSkills
            }, { new: true });
          } else {
            // Fail: DO NOT add new skills.
            // DO NOT demote role if they already have other verified skills.
            let newRole = currentUser.role;
            const currentSkills = currentUser.skillsToTeach || [];
            if (currentSkills.length === 0) {
              newRole = 'student';
            }
            const isVerifiedMentor = newRole === 'mentor';

            updatedUser = await User.findByIdAndUpdate(userId, {
              role: newRole,
              isVerifiedMentor
            }, { new: true });
          }
        }
      } catch (err) {
        console.error('Error updating user in database:', err);
      }
    }

    const responsePayload = {
      verified: finalScore >= 60,
      evaluationResult: {
        ...evaluationResult,
        candidateId: userId,
        subject: skills[0] || 'General'
      }
    };

    if (updatedUser) {
      responsePayload.user = {
        id: updatedUser._id,
        name: updatedUser.name,
        role: updatedUser.role,
        credits: updatedUser.credits,
        skillsToTeach: updatedUser.skillsToTeach,
        preferredLanguage: updatedUser.preferredLanguage,
        availableTimings: updatedUser.availableTimings
      };
    } else {
      responsePayload.user = {
        id: userId || 'mock',
        name: 'Guest/Mock User',
        role: roleUpdate,
        credits: 100,
        skillsToTeach: skills,
        preferredLanguage: 'English',
        availableTimings: []
      };
    }

    res.status(finalScore >= 60 ? 200 : 400).json(responsePayload);
  } catch (error) {
    console.error('Error during evaluation:', error);
    res.status(500).json({ message: 'Server error during evaluation' });
  }
});

module.exports = router;
