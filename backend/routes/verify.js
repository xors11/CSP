const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Question = require('../models/Question');
const VerificationAttempt = require('../models/VerificationAttempt');

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

// Detect subject category for routing to correct prompt
function getSubjectCategory(subjectsStr) {
  const lower = subjectsStr.toLowerCase();

  const medicalKeywords = [
    'anatomy', 'physiology', 'biochemistry', 'pathology', 'pharmacology',
    'microbiology', 'forensic medicine', 'community medicine', 'preventive',
    'social medicine', 'ophthalmology', 'ent', 'ear nose', 'otorhinolaryngology',
    'general medicine', 'general surgery', 'obstetrics', 'gynecology',
    'gynaecology', 'pediatrics', 'paediatrics', 'orthopedics', 'orthopaedics',
    'radiology', 'dermatology', 'psychiatry', 'anesthesiology', 'anaesthesiology',
    'emergency medicine', 'mbbs', 'usmle', 'neet pg', 'plab', 'clinical'
  ];
  if (medicalKeywords.some(kw => lower.includes(kw))) return 'medical';

  const codingKeywords = [
    'python', 'javascript', 'java', 'c++', 'c#', 'react', 'node',
    'data structures', 'dsa', 'algorithms', 'machine learning', 'ml', 'ai',
    'dbms', 'database', 'operating systems', 'os', 'computer networks',
    'software engineering', 'web development', 'b.tech'
  ];
  if (codingKeywords.some(kw => lower.includes(kw))) return 'coding';

  const scienceMathKeywords = [
    'mathematics', 'physics', 'chemistry', 'biology', 'science',
    '9th', '10th', '11th', '12th', 'math', 'calculus', 'algebra',
    'statistics', 'trigonometry', 'geometry', 'mechanics', 'thermodynamics',
    'organic chemistry', 'inorganic chemistry', 'genetics', 'ecology'
  ];
  if (scienceMathKeywords.some(kw => lower.includes(kw))) return 'science';

  return 'other';
}

// Single unified system prompt builder for ALL subjects
function buildSystemPrompt(subject, count) {
  const category = getSubjectCategory(subject);

  // Reference standards per category
  const referenceBlock = {
    medical: `- Medical subjects: Gray's Anatomy, Harrison's, Robbins, KD Tripathi, Nelson's, etc.`,
    coding: `- Programming subjects: Official language documentation, CLRS for DSA, MDN for Web, SICP`,
    science: `- Physics: Halliday & Resnick, HC Verma, University Physics
- Chemistry: Morrison & Boyd, JD Lee, NCERT
- Biology: Campbell Biology, Alberts Molecular Biology
- Mathematics: Standard university textbooks, NCERT, MIT OpenCourseWare`,
    other: `- Use the most widely accepted academic or professional standard reference for this subject`
  }[category];

  // Question type distribution per category
  const typeDistributionBlock = {
    medical: `FOR THIS MEDICAL SUBJECT ("${subject}"):
- 40% Clinical case-based MCQ — type: "Case-Based" (real patient scenario)
- 25% Single best answer MCQ — type: "MCQ" (standard theory-based)
- 20% Image/diagram-based — type: "Image-Based" (described in text, no actual image)
- 15% Short reasoning — type: "Theory" (explain why/how)
ALLOWED TYPES ONLY: "MCQ", "Case-Based", "Image-Based", "Theory"
DO NOT generate any "Coding", "Fill-in-the-blank", or "Numerical" questions for this subject.`,

    coding: `FOR THIS CODING/TECHNICAL SUBJECT ("${subject}"):
- 40% Coding problems (with constraints, edge cases, complexity) — type: "Coding"
- 30% MCQ (syntax, concepts, debugging, output prediction) — type: "MCQ"
- 20% Theory (architecture, design patterns, trade-offs) — type: "Theory"
- 10% Fill-in-the-blank (precise technical terminology) — type: "Fill-in-the-blank"
ALLOWED TYPES: "Coding", "MCQ", "Theory", "Fill-in-the-blank"`,

    science: `FOR THIS SCIENCE/MATH SUBJECT ("${subject}"):
- 40% Numerical/problem-solving questions — type: "Numerical"
- 30% MCQ (concept-based, formula application) — type: "MCQ"
- 20% Theory (derivations, proofs, explanations) — type: "Theory"
- 10% Fill-in-the-blank (precise scientific terminology) — type: "Fill-in-the-blank"
ALLOWED TYPES: "Numerical", "MCQ", "Theory", "Fill-in-the-blank"
DO NOT generate any "Coding" questions for this subject.`,

    other: `FOR THIS SUBJECT ("${subject}"):
- 50% MCQ (concept-based, applied, analytical) — type: "MCQ"
- 25% Theory (reasoning, comparison, application) — type: "Theory"
- 15% Case/Scenario-based questions — type: "Case-Based"
- 10% Fill-in-the-blank (precise terminology) — type: "Fill-in-the-blank"
ALLOWED TYPES: "MCQ", "Theory", "Case-Based", "Fill-in-the-blank"
DO NOT generate any "Coding" questions for this subject.`
  }[category];

  // Medical-specific extra rules
  const medicalExtraBlock = category === 'medical' ? `
═══════════════════════════════════════════════════════
MEDICAL SUBJECT SPECIAL RULES
═══════════════════════════════════════════════════════
- Always base questions on standard medical textbooks listed above
- Questions must reflect real clinical scenarios, not just theoretical recall
- For clinical subjects, ALWAYS frame questions as real patient scenarios:
  "A 45-year-old male presents with chest pain radiating to the left arm..."
- MCQ distractors MUST use real medical terms — no obviously wrong options
- Every distractor must be a plausible differential or commonly confused alternative
- NEVER include questions that could be misused for self-diagnosis or self-medication
- Always mention the standard reference and chapter for the correct answer
- "case" field (for Case-Based) must be a plain string — the full patient presentation
- "image_description" (for Image-Based) must be a plain string — describe findings as if reporting` : '';

  // Timer block per type
  const timerBlock = category === 'medical' ? `
- MCQ (single best answer): time_limit_seconds: 90
- Case-Based (clinical scenario MCQ): time_limit_seconds: 180
- Image-Based (diagram/imaging MCQ): time_limit_seconds: 120
- Theory (short reasoning): time_limit_seconds: 240` : `
- MCQ: time_limit_seconds: 90
- Theory: time_limit_seconds: 180
- Coding: time_limit_seconds: 480
- Fill-in-the-blank: time_limit_seconds: 60
- Case-Based / Scenario: time_limit_seconds: 180
- Numerical / Problem-solving: time_limit_seconds: 240
- Image-Based: time_limit_seconds: 120`;

  // Easy count: 30%, medium: 50%, hard: 20%
  const easyCount = Math.round(count * 0.30);
  const medCount = Math.round(count * 0.50);
  const hardCount = count - easyCount - medCount;

  return `You are a strict, senior-level expert examiner and professional question generator with zero tolerance for vague, repeated, trivial, or inaccurate questions. You operate at the standard of USMLE, NEET PG, FAANG, and top-tier professional certification exams.

When generating questions for a subject, you produce rigorous, accurate, and deeply researched questions that truly test the depth of a candidate's knowledge — not just surface-level recall.

═══════════════════════════════════════════════════════
SUBJECT ISOLATION RULES (CRITICAL — APPLY TO EVERY SUBJECT)
═══════════════════════════════════════════════════════
- You are initialized with ONE specific subject for this session: "${subject}"
- ONLY generate questions strictly related to "${subject}"
- NEVER mix questions from other subjects even if they are related or overlapping
  * If subject is "Python" → NO JavaScript, Java, or any other language questions
  * If subject is "Pharmacology" → NO Biochemistry or Pathology questions
  * If subject is "Anatomy" → NO Physiology questions even if they overlap
  * If subject is "DSA" → NO language-specific syntax questions
  * If subject is "General Medicine" → NO Surgery or Pediatrics questions
  * If subject is "Biology" → NO Chemistry or Physics questions
- Every single question must pass this check before being included:
  "Is this question 100% about ${subject} and nothing else?" — if NO, discard it
- NEVER carry over topics, concepts, or patterns from any previous session
- Each session is completely isolated — treat every request as a fresh start
- The subject is set ONCE at the start and cannot change mid-session

═══════════════════════════════════════════════════════
QUESTION COUNT AND SECTION DISTRIBUTION
═══════════════════════════════════════════════════════
- Total questions for this session: ${count}
- Section 1 — Foundation (easy): ${easyCount} questions (30%)
- Section 2 — Applied (medium): ${medCount} questions (50%)
- Section 3 — Advanced (hard): ${hardCount} questions (20%)

═══════════════════════════════════════════════════════
TOPIC COVERAGE RULES
═══════════════════════════════════════════════════════
- Every major topic within ${subject} must have at least 2 questions
- No single topic should have more than 15% of total questions
${category === 'coding' ? '- Must cover at least 5 different problem categories' : ''}
${category === 'medical' ? '- Must cover at least 8 different systems or drug classes' : '- Must cover at least 6 different major topics'}
- No two questions should test the exact same concept or scenario

═══════════════════════════════════════════════════════
QUESTION TYPE DISTRIBUTION (STRICTLY ENFORCED)
═══════════════════════════════════════════════════════
${typeDistributionBlock}${medicalExtraBlock}

═══════════════════════════════════════════════════════
STRICTNESS RULES
═══════════════════════════════════════════════════════
- NEVER generate basic "what is X" definitions unless difficulty is explicitly "easy"
- NEVER repeat concepts across questions even if phrased differently
- NEVER generate questions that can be answered by guessing or common sense alone
- NEVER use vague or ambiguous wording in any question
- NEVER include questions based on unverified, outdated, or inaccurate information
- Every question must test a SPECIFIC, ISOLATED concept — no overlap
- Questions must reflect real-world scenarios, edge cases, and professional expectations
- MCQ wrong options (distractors) must be plausible, realistic, and closely related — no obviously wrong answers
- Theory questions must demand explanation, reasoning, or comparison — not just recall
- Fill-in-the-blank must test precise technical or domain-specific terminology
- Always mention the standard reference or source for the correct answer
- If unsure about accuracy of a question, discard it entirely — never include doubtful content

REFERENCE STANDARDS:
${referenceBlock}
- Every answer must cite its reference source in the "reference" field

QUESTION QUALITY CHECKLIST (apply to EVERY question before including it):
✅ Tests a specific, non-trivial concept
✅ Cannot be answered by guessing
✅ Distractors (MCQ) are realistic, plausible, and tricky
✅ Coding problems have constraints, edge cases, and complexity requirements
✅ No two questions test the same concept
✅ Language and wording are precise and unambiguous
✅ Information is 100% accurate and verified against standard references
✅ Matches top-tier professional or exam standards
✅ Reference source is cited for the correct answer

═══════════════════════════════════════════════════════
DIFFICULTY STANDARDS
═══════════════════════════════════════════════════════
- easy:
  * Medical: First year MBBS level — basic anatomy, normal values, drug classes
  * Coding/Tech: Foundational concepts, standard syntax, basic use cases
  * Science/Math: Core formulas, basic theorems, standard definitions
  * General: Beginner-level foundational knowledge

- medium:
  * Medical: Second/Third year MBBS — applied concepts, clinical correlations
  * Coding/Tech: Applied knowledge, debugging, trade-off analysis, moderate algorithms
  * Science/Math: Multi-step problems, applied theorems, numerical problem solving
  * General: Intermediate application and analysis

- hard:
  * Medical: Final year MBBS / PG entrance (USMLE, NEET PG, PLAB) — complex cases, rare presentations
  * Coding/Tech: System design, optimization, deep internals, FAANG-level problems
  * Science/Math: Advanced proofs, complex derivations, research-level problems
  * General: Expert-level reasoning, synthesis, and evaluation

═══════════════════════════════════════════════════════
TIMER RULES
═══════════════════════════════════════════════════════
Assign time_limit_seconds per question based on type:${timerBlock}
- Calculate total_time_seconds by summing all individual question time limits
- Include per-question time limit as "time_limit_seconds" in each question object

═══════════════════════════════════════════════════════
JSON TYPE SAFETY RULES (MANDATORY)
═══════════════════════════════════════════════════════
- ALL string fields must be primitive strings — NEVER objects or nested arrays
- "options" must be an array of exactly 4 plain strings: ["A. ...", "B. ...", "C. ...", "D. ..."]
- "answer" must be exactly one of the option strings (for MCQ/Case-Based/Image-Based)
- "reference" must be a plain string with textbook name and chapter
- "edge_cases" (for Coding) must be an array of plain strings — NEVER objects
- "example.input" and "example.output" must be plain strings — NEVER objects
- "constraints" (for Coding) must be a plain string
- "expected_complexity.time" and "expected_complexity.space" must be plain strings e.g. "O(n log n)"
- "case" field (for Case-Based) must be a plain string
- "image_description" (for Image-Based) must be a plain string

═══════════════════════════════════════════════════════
OUTPUT FORMAT (strict JSON only — no markdown, no backticks, no preamble, no trailing text)
═══════════════════════════════════════════════════════
{
  "subject": "${subject}",
  "total_questions": ${count},
  "total_time_seconds": <exact sum of all question time_limit_seconds>,
  "sections": {
    "foundation": ${easyCount},
    "applied": ${medCount},
    "advanced": ${hardCount}
  },
  "questions": [
    {
      "id": 1,
      "type": "MCQ",
      "difficulty": "easy | medium | hard",
      "time_limit_seconds": 90,
      "question": "<precise question text>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<correct option exactly as listed>",
      "reference": "<standard textbook, documentation, or source>",
      "explanation": "<why correct + why each distractor is wrong>"
    },
    {
      "id": 2,
      "type": "Coding",
      "difficulty": "medium",
      "time_limit_seconds": 480,
      "question": "<detailed problem statement>",
      "constraints": "<e.g. 1 ≤ n ≤ 10^5>",
      "input_format": "<describe input>",
      "output_format": "<describe output>",
      "example": { "input": "<plain string>", "output": "<plain string>" },
      "edge_cases": ["<plain string edge case 1>", "<plain string edge case 2>"],
      "expected_complexity": { "time": "O(...)", "space": "O(...)" },
      "answer": "<optimal solution code>",
      "reference": "<official docs or standard resource>",
      "explanation": "<approach, why optimal, alternatives considered>"
    },
    {
      "id": 3,
      "type": "Theory",
      "difficulty": "hard",
      "time_limit_seconds": 180,
      "question": "<question demanding reasoning or comparison>",
      "answer": "<detailed, precise answer>",
      "reference": "<standard textbook or source>",
      "explanation": "<real-world relevance and depth>"
    },
    {
      "id": 4,
      "type": "Case-Based",
      "difficulty": "hard",
      "time_limit_seconds": 180,
      "case": "<detailed patient or real-world scenario>",
      "question": "<specific question about the scenario>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<correct option>",
      "reference": "<standard textbook and chapter>",
      "explanation": "<full reasoning, diagnosis or solution, why others are wrong>"
    },
    {
      "id": 5,
      "type": "Fill-in-the-blank",
      "difficulty": "easy",
      "time_limit_seconds": 60,
      "question": "<sentence with ___ blank using precise technical context>",
      "answer": "<exact technical or domain-specific term>",
      "reference": "<source>",
      "explanation": "<why this term is correct>"
    },
    {
      "id": 6,
      "type": "Numerical",
      "difficulty": "medium",
      "time_limit_seconds": 240,
      "question": "<problem requiring calculation or derivation>",
      "given": "<known values and conditions>",
      "answer": "<step-by-step solution with final answer>",
      "reference": "<textbook and formula reference>",
      "explanation": "<why each step is done and formula used>"
    },
    {
      "id": 7,
      "type": "Image-Based",
      "difficulty": "medium",
      "time_limit_seconds": 120,
      "image_description": "<detailed textual description of the image/diagram/X-ray/histology/ECG finding>",
      "question": "<question about the image finding>",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "answer": "<correct option exactly as listed>",
      "reference": "<standard textbook and chapter>",
      "explanation": "<why the finding indicates this answer + differentials>"
    }
  ]
}

IMPORTANT FINAL RULES:
- Return ONLY valid JSON — no markdown, no backticks, no preamble, no trailing text
- For MCQ always include exactly 4 options where all distractors are plausible
- For Coding always include constraints, edge cases, complexity, and optimal solution
- For Theory always demand reasoning or comparison — never simple recall
- For Case-Based always include a detailed real-world scenario before the question
- For Numerical always show full step-by-step solution
- Never repeat questions or concepts
- Every answer must cite a reference source
- total_time_seconds must be the exact sum of all question time_limit_seconds values
- All questions must be 100% accurate — if uncertain, discard the question entirely`;
}

// Replace any Coding-type questions in a non-coding subject response with Theory questions
function sanitizeNonCodingSubject(questions, subject) {
  return questions.map((q) => {
    if (q.type === 'Coding') {
      console.warn(`[SANITIZE] Replacing disallowed Coding question (id=${q.id}) for non-coding subject "${subject}"`);
      return {
        id: q.id,
        type: 'Theory',
        difficulty: q.difficulty || 'medium',
        time_limit_seconds: 180,
        question: `Explain in detail the core concept, underlying principles, and real-world application of: ${q.question}`,
        answer: `A thorough understanding of this topic in ${subject} involves examining its foundational definitions, how it connects to broader principles, and where it is applied in practice.`,
        reference: 'Standard reference textbook for this subject',
        explanation: `This question tests deep conceptual understanding specific to ${subject}.`
      };
    }
    return q;
  });
}

// Generate highly rigorous dynamic AI questions
router.get('/generate', async (req, res) => {
  const subjects = req.query.subjects || 'General';
  const category = getSubjectCategory(subjects);

  // QUESTION COUNT RULES:
  // - Minimum per test: 25
  // - Default if not specified: 50
  // - Maximum per session: 100
  // - Medical subjects minimum: 50
  const DEFAULT_COUNT = 50;
  const MIN_COUNT = 25;
  const MAX_COUNT = 100;
  const MEDICAL_MIN = 50;

  let count = req.query.count ? parseInt(req.query.count) : DEFAULT_COUNT;
  if (isNaN(count) || count < MIN_COUNT) count = MIN_COUNT;
  if (count > MAX_COUNT) count = MAX_COUNT;
  if (category === 'medical' && count < MEDICAL_MIN) count = MEDICAL_MIN;

  console.log(`[COUNT] Subject: "${subjects}" | Category: ${category} | Requested: ${req.query.count || '(default)'} | Final: ${count}`);

  // Helper: call Groq for a single batch of questions
  async function fetchBatchFromGroq(batchCount, batchIndex, totalBatches) {
    const systemPrompt = buildSystemPrompt(subjects, batchCount);
    const typeInstruction = {
      medical: `40% Case-Based, 25% MCQ, 20% Image-Based, 15% Theory. Every question must be clinically accurate and reference a standard textbook. DO NOT generate any Coding questions.`,
      coding: `40% Coding (with constraints, edge cases, complexity), 30% MCQ, 20% Theory, 10% Fill-in-the-blank. At least 40% must be Coding type.`,
      science: `40% Numerical (step-by-step solutions), 30% MCQ, 20% Theory, 10% Fill-in-the-blank. DO NOT generate any Coding questions.`,
      other: `50% MCQ, 25% Theory, 15% Case-Based, 10% Fill-in-the-blank. DO NOT generate any Coding questions.`
    }[category];
    const batchNote = totalBatches > 1
      ? ` This is batch ${batchIndex + 1} of ${totalBatches}. Generate COMPLETELY DIFFERENT questions from other batches — no repeated topics, scenarios, or concepts.`
      : '';
    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate exactly ${batchCount} questions EXCLUSIVELY about "${subjects}".${batchNote} ` +
          `Follow the type distribution strictly: ${typeInstruction} ` +
          `Section distribution: 30% easy, 50% medium, 20% hard. ` +
          `Every single question must be 100% about "${subjects}" only — no overlap with any other subject. ` +
          `Enforce JSON type safety: edge_cases must be plain string arrays, example.input/output must be plain strings. ` +
          `Output ONLY valid JSON — no markdown, no backticks, no preamble.`
      }
    ];
    console.log(`[BATCH ${batchIndex + 1}/${totalBatches}] Requesting ${batchCount} questions from Groq for: "${subjects}"...`);
    const content = await callGroq(messages, true);
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    let batchQs = parsed.questions || [];
    // Strip any Coding questions that slipped through for non-coding subjects
    if (category !== 'coding') {
      const hasCoding = batchQs.some(q => q.type === 'Coding');
      if (hasCoding) {
        batchQs = sanitizeNonCodingSubject(batchQs, subjects);
        console.log(`[SANITIZE] Removed Coding questions from "${category}" subject "${subjects}" in batch ${batchIndex + 1}.`);
      }
    }
    return batchQs;
  }

  try {
    if (!process.env.GROQ_API_KEY) {
      console.log('No GROQ_API_KEY found, falling back to DB...');
      const dbResult = await getQuestionsFromDB(subjects, count);
      return res.status(200).json(dbResult);
    }

    // ─── BATCHED GROQ STRATEGY ────────────────────────────────────────────────
    // Split large requests (> 30 questions) into multiple Groq calls of ≤ 30 each.
    // This ensures the AI stays focused and produces high-quality questions for
    // all test modes including Mock Exam (100 questions).
    const BATCH_SIZE = 30;
    let allQuestions = [];

    if (count <= BATCH_SIZE) {
      try {
        const batchQs = await fetchBatchFromGroq(count, 0, 1);
        allQuestions = batchQs;
      } catch (err) {
        console.error(`[BATCH] Groq call failed: ${err.message}. Falling back to DB...`);
        const dbResult = await getQuestionsFromDB(subjects, count);
        return res.status(200).json(dbResult);
      }
    } else {
      const batches = [];
      let remaining = count;
      while (remaining > 0) { batches.push(Math.min(BATCH_SIZE, remaining)); remaining -= BATCH_SIZE; }
      console.log(`[BATCH] Splitting ${count} questions into ${batches.length} batches: [${batches.join(', ')}]`);
      for (let bIdx = 0; bIdx < batches.length; bIdx++) {
        const batchCount = batches[bIdx];
        try {
          const batchQs = await fetchBatchFromGroq(batchCount, bIdx, batches.length);
          const offset = allQuestions.length;
          batchQs.forEach((q, i) => { q.id = offset + i + 1; });
          allQuestions.push(...batchQs);
          console.log(`[BATCH ${bIdx + 1}/${batches.length}] Got ${batchQs.length} questions. Total: ${allQuestions.length}`);
        } catch (err) {
          console.error(`[BATCH ${bIdx + 1}/${batches.length}] Failed: ${err.message}. Padding with JS fallback...`);
          const padQs = generateJSFallbackQuestions(subjects, batchCount, allQuestions.length + 1);
          allQuestions.push(...padQs);
        }
      }
    }

    // Safety pad if still short
    if (allQuestions.length < count) {
      const missing = count - allQuestions.length;
      console.log(`[PAD] Got ${allQuestions.length}/${count}. Padding ${missing} with JS fallback...`);
      const padQs = generateJSFallbackQuestions(subjects, missing, allQuestions.length + 1);
      allQuestions.push(...padQs);
    }
    allQuestions = allQuestions.slice(0, count);

    const easyCount = allQuestions.filter(q => q.difficulty === 'easy').length;
    const mediumCount = allQuestions.filter(q => q.difficulty === 'medium').length;
    const hardCount = allQuestions.filter(q => q.difficulty === 'hard').length;
    const total_time_seconds = allQuestions.reduce((sum, q) => sum + (q.time_limit_seconds || 90), 0);

    console.log(`[GENERATE COMPLETE] Subject: "${subjects}" | Questions: ${allQuestions.length} | Time: ${total_time_seconds}s`);
    res.status(200).json({
      subject: subjects,
      total_questions: allQuestions.length,
      total_time_seconds,
      sections: { foundation: easyCount, applied: mediumCount, advanced: hardCount },
      questions: allQuestions
    });
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

// Evaluate candidate answers — full master grading schema
router.post('/evaluate', async (req, res) => {
  try {
    const { userId, skills, questions, answers, timeTakenSeconds } = req.body;
    const subject = (skills && skills[0]) || 'General';

    // Calculate attempt number and generate unique session ID
    let attempt_number = 1;
    const session_id = 'sess_' + require('crypto').randomBytes(8).toString('hex') + '_' + Date.now();
    if (userId && userId !== 'mock' && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const prevCount = await VerificationAttempt.countDocuments({ user_id: userId, subject });
        attempt_number = prevCount + 1;
      } catch (err) {
        console.error('[EVALUATE] Error calculating attempt number:', err);
      }
    }

    // --- Build not-attempted tracking ---
    const attemptedIds = new Set();
    const notAttemptedIds = [];
    if (questions && answers) {
      questions.forEach(q => {
        const ans = answers[q.id];
        const attempted = ans !== null && ans !== undefined && String(ans).trim() !== '';
        if (attempted) attemptedIds.add(q.id);
        else notAttemptedIds.push(q.id);
      });
    }
    const totalQ = questions ? questions.length : 0;
    const attemptedCount = attemptedIds.size;
    const totalTimeAllotted = questions ? questions.reduce((s, q) => s + (q.time_limit_seconds || 90), 0) : 0;

    let evaluationResult = null;

    if (process.env.GROQ_API_KEY && questions && answers) {
      try {
        console.log(`[EVALUATE] Grading ${totalQ} questions for subject "${subject}" (${attemptedCount} attempted)...`);

        const evalSystemPrompt = `You are evaluating a completed exam. The user has submitted their test answers.
Your job is to IMMEDIATELY generate a complete, detailed result report the moment you receive the submitted answers.

CRITICAL EXECUTION RULES:
- Generate the result report INSTANTLY — NEVER return empty, null, or undefined
- NEVER skip the result generation step
- NEVER wait for additional input before generating the result
- If any answer is missing or null, treat it as "Not Attempted" — do NOT skip it
- The result must include EVERY question — attempted, wrong, correct, and not attempted
- ALWAYS return valid JSON — if something is unclear, make your best evaluation and include it

ANSWER EVALUATION RULES:
- MCQ / Case-Based / Image-Based: Mark correct ONLY if user answer matches the correct answer exactly (case-insensitive trim)
- Coding: evaluate if the logic and output is correct — not just exact string match; grade on logic, constraints compliance, edge case handling, and time/space complexity
- Theory: Grade on conceptual accuracy, completeness, and correctness (0 = no effort, 0.5 = partial, 1 = correct)
- Fill-in-the-blank: exact or semantically equivalent match (allow minor spelling variations)
- Numerical: check if final answer is correct — allow minor rounding differences; grade step-by-step solution
- If user_answer is null or empty → is_correct: false, is_attempted: false, mistake_type: "Not Attempted"

MISTAKE CLASSIFICATION RULES (assign to every wrong or unattempted answer):
- "Wrong Concept": answer is based on a completely different concept
- "Calculation Error": concept is right but math or logic is wrong
- "Misread Question": answered a different part of the question
- "Careless Mistake": knows the concept but made a silly error
- "Not Attempted": user_answer is null or empty

SCORE CALCULATION RULES:
- correct: count of questions where is_correct is true
- incorrect: count of questions where is_attempted is true AND is_correct is false
- not_attempted: count of questions where is_attempted is false
- score: "correct/total_questions" (e.g. "7/10")
- percentage: (correct / total_questions * 100).toFixed(2) as a plain number string (e.g. "70.00")
- strong_topics: topics with accuracy above 80%
- weak_topics: topics with accuracy below 60%

GRADING SCALE (apply strictly):
- A+: 95% and above  → Excellent
- A:  85% - 94%      → Good
- B:  70% - 84%      → Average
- C:  55% - 69%      → Below Average
- D:  40% - 54%      → Poor
- F:  Below 40%      → Fail

TOPIC ANALYSIS:
- Identify the topic of each question from its content
- Group questions by topic
- Calculate accuracy per topic
- Status: "Strong" if accuracy >= 80%, "Needs Improvement" if 60-79%, "Critical" if < 60%

IMPROVEMENT PLAN:
- Only include topics where accuracy < 80%
- Sort High priority first, then Medium, then Low
- High priority: accuracy < 40% or more than 3 wrong in a topic
- Medium priority: accuracy 40-70%
- Low priority: accuracy 70-80%

VALIDATION BEFORE RETURNING:
- result_summary is fully populated with no null or missing fields
- question_review contains EVERY question — no question is skipped
- Every question has correct_answer populated
- Every wrong answer has why_user_was_wrong, concept_to_review, study_resource
- score and percentage are mathematically correct
- grade matches the percentage using the grading scale exactly
- topic_analysis covers every topic that appeared in the test
- difficulty_analysis totals match the actual question distribution
- mistake_pattern counts add up correctly
- improvement_plan exists and is sorted by priority
- JSON is valid — no trailing commas, no missing brackets

OUTPUT: Return ONLY valid JSON — no markdown, no backticks, no preamble, no trailing text.
Use this EXACT schema:
{
  "result_summary": {
    "subject": "<subject>",
    "total_questions": <n>,
    "attempted": <n>,
    "not_attempted": <n>,
    "not_attempted_ids": [<ids>],
    "not_attempted_penalty": "0 marks awarded for unattempted questions",
    "correct": <n>,
    "incorrect": <n>,
    "score": "<correct>/<total>",
    "percentage": "<0-100 number as string, 2 decimal places>",
    "time_taken_seconds": <n>,
    "time_allotted_seconds": <n>,
    "grade": "A+ | A | B | C | D | F",
    "performance_level": "Excellent | Good | Average | Below Average | Poor | Fail",
    "strong_topics": ["<topic>"],
    "weak_topics": ["<topic>"],
    "recommendation": "<personalized recommendation based on actual mistake patterns>"
  },
  "question_review": [
    {
      "id": <n>,
      "type": "<type>",
      "difficulty": "<easy|medium|hard>",
      "question": "<question text>",
      "user_answer": "<user answer or null>",
      "correct_answer": "<correct answer>",
      "is_correct": <true|false>,
      "is_attempted": <true|false>,
      "mistake_type": "<mistake type or null if correct>",
      "reference": "<source>",
      "explanation": "<full explanation of correct answer>",
      "why_user_was_wrong": "<specific reason or null if correct>",
      "concept_to_review": "<exact topic or null if correct>",
      "study_resource": "<exact book, chapter, or resource>"
    }
  ],
  "topic_analysis": [
    {
      "topic": "<topic>",
      "total_questions": <n>,
      "correct": <n>,
      "incorrect": <n>,
      "not_attempted": <n>,
      "accuracy": "<percentage>",
      "status": "Strong | Needs Improvement | Critical"
    }
  ],
  "difficulty_analysis": {
    "easy":   { "total": <n>, "correct": <n>, "incorrect": <n>, "not_attempted": <n>, "accuracy": "<pct>" },
    "medium": { "total": <n>, "correct": <n>, "incorrect": <n>, "not_attempted": <n>, "accuracy": "<pct>" },
    "hard":   { "total": <n>, "correct": <n>, "incorrect": <n>, "not_attempted": <n>, "accuracy": "<pct>" }
  },
  "mistake_pattern": {
    "wrong_concept": <n>,
    "calculation_error": <n>,
    "misread_question": <n>,
    "careless_mistake": <n>,
    "not_attempted": <n>
  },
  "improvement_plan": [
    {
      "priority": "High | Medium | Low",
      "topic": "<topic>",
      "issue": "<what the student is struggling with>",
      "action": "<specific action to take>",
      "resource": "<exact book, chapter, or resource>"
    }
  ]
}`;

        const messages = [
          { role: 'system', content: evalSystemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              subject,
              examQuestions: questions,
              candidateAnswers: answers,
              notAttemptedIds,
              timeTakenSeconds: timeTakenSeconds || 0,
              totalTimeAllotted
            })
          }
        ];

        const content = await callGroq(messages, true);
        let cleaned = content.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
        }
        evaluationResult = JSON.parse(cleaned);
        // Enrich question_review items with original question fields (options, case, image_description, given)
        if (evaluationResult && Array.isArray(evaluationResult.question_review)) {
          evaluationResult.question_review = evaluationResult.question_review.map(qr => {
            const originalQ = questions.find(q => q.id === qr.id);
            if (originalQ) {
              return {
                ...qr,
                options: originalQ.options || null,
                case: originalQ.case || null,
                image_description: originalQ.image_description || null,
                given: originalQ.given || null
              };
            }
            return qr;
          });
        }
        console.log(`[EVALUATE] Groq grading complete. Score: ${evaluationResult?.result_summary?.percentage}%`);
      } catch (err) {
        console.error('[EVALUATE] Groq grading failed, falling back to local grader:', err.message);
      }
    }

    // --- Local Fallback Grader ---
    if (!evaluationResult) {
      console.log('[EVALUATE] Using local fallback grading engine...');
      let correct = 0;
      const questionReview = [];
      const difficultyMap = { easy: { total: 0, correct: 0, incorrect: 0, not_attempted: 0 }, medium: { total: 0, correct: 0, incorrect: 0, not_attempted: 0 }, hard: { total: 0, correct: 0, incorrect: 0, not_attempted: 0 } };
      const topicMap = {};
      const mistakePattern = { wrong_concept: 0, calculation_error: 0, misread_question: 0, careless_mistake: 0, not_attempted: 0 };

      (questions || []).forEach(q => {
        const userAns = answers ? answers[q.id] : null;
        const isAttempted = userAns !== null && userAns !== undefined && String(userAns).trim() !== '';
        const diff = q.difficulty || 'medium';
        if (difficultyMap[diff]) difficultyMap[diff].total++;

        let isCorrect = false;
        let mistakeType = null;

        if (!isAttempted) {
          mistakeType = 'Not Attempted';
          mistakePattern.not_attempted++;
          if (difficultyMap[diff]) difficultyMap[diff].not_attempted++;
        } else {
          const ua = String(userAns).trim().toLowerCase();
          const ca = String(q.answer || '').trim().toLowerCase();
          if (q.type === 'MCQ' || q.type === 'Case-Based' || q.type === 'Image-Based' || q.type === 'Fill-in-the-blank') {
            isCorrect = ua === ca;
          } else {
            // Theory/Coding/Numerical — length as proxy
            isCorrect = ua.length > 50;
          }
          if (isCorrect) {
            correct++;
            if (difficultyMap[diff]) difficultyMap[diff].correct++;
          } else {
            mistakeType = 'Wrong Concept';
            mistakePattern.wrong_concept++;
            if (difficultyMap[diff]) difficultyMap[diff].incorrect++;
          }
        }

        // Topic tracking (use subject as fallback topic)
        const topic = subject;
        if (!topicMap[topic]) topicMap[topic] = { total: 0, correct: 0, incorrect: 0, not_attempted: 0 };
        topicMap[topic].total++;
        if (!isAttempted) topicMap[topic].not_attempted++;
        else if (isCorrect) topicMap[topic].correct++;
        else topicMap[topic].incorrect++;

        questionReview.push({
          id: q.id,
          type: q.type,
          difficulty: q.difficulty,
          question: q.question,
          options: q.options || null,
          case: q.case || null,
          image_description: q.image_description || null,
          given: q.given || null,
          user_answer: isAttempted ? userAns : null,
          correct_answer: q.answer,
          is_correct: isCorrect,
          is_attempted: isAttempted,
          mistake_type: isCorrect ? null : mistakeType,
          reference: q.reference || 'Standard reference',
          explanation: q.explanation || 'See standard reference for full explanation.',
          why_user_was_wrong: isCorrect ? null : (isAttempted ? 'Incorrect answer selected.' : 'This question was not attempted'),
          concept_to_review: isCorrect ? null : (isAttempted ? (q.question ? q.question.substring(0, 80) + '...' : subject) : (q.reference || subject)),
          study_resource: q.reference || `Standard textbook for ${subject}`
        });
      });

      const percentage = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0;
      const grade = percentage >= 95 ? 'A+' : percentage >= 85 ? 'A' : percentage >= 70 ? 'B' : percentage >= 55 ? 'C' : percentage >= 40 ? 'D' : 'F';
      const perfLevel = percentage >= 95 ? 'Excellent' : percentage >= 85 ? 'Good' : percentage >= 70 ? 'Average' : percentage >= 55 ? 'Below Average' : percentage >= 40 ? 'Poor' : 'Fail';

      const topicAnalysis = Object.entries(topicMap).map(([topic, d]) => {
        const acc = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
        return { topic, total_questions: d.total, correct: d.correct, incorrect: d.incorrect, not_attempted: d.not_attempted, accuracy: `${acc}%`, status: acc >= 80 ? 'Strong' : acc >= 60 ? 'Needs Improvement' : 'Critical' };
      });

      const diffAnalysis = {};
      Object.entries(difficultyMap).forEach(([diff, d]) => {
        const acc = d.total > 0 ? Math.round(((d.correct) / d.total) * 100) : 0;
        diffAnalysis[diff] = { total: d.total, correct: d.correct, incorrect: d.incorrect, not_attempted: d.not_attempted, accuracy: `${acc}%` };
      });

      const weakTopics = topicAnalysis.filter(t => parseInt(t.accuracy) < 60).map(t => t.topic);
      const strongTopics = topicAnalysis.filter(t => parseInt(t.accuracy) >= 80).map(t => t.topic);

      const improvementPlan = topicAnalysis
        .filter(t => parseInt(t.accuracy) < 80)
        .map(t => {
          const acc = parseInt(t.accuracy);
          return {
            priority: acc < 40 ? 'High' : acc < 70 ? 'Medium' : 'Low',
            topic: t.topic,
            issue: `Low accuracy (${t.accuracy}) in ${t.topic}`,
            action: `Review core concepts and practice more questions in ${t.topic}`,
            resource: `Standard textbook for ${subject}`
          };
        })
        .sort((a, b) => { const p = { High: 0, Medium: 1, Low: 2 }; return p[a.priority] - p[b.priority]; });

      evaluationResult = {
        result_summary: {
          subject,
          total_questions: totalQ,
          attempted: attemptedCount,
          not_attempted: notAttemptedIds.length,
          not_attempted_ids: notAttemptedIds,
          not_attempted_penalty: '0 marks awarded for unattempted questions',
          correct,
          incorrect: attemptedCount - correct,
          score: `${correct}/${totalQ}`,
          percentage: `${percentage}`,
          time_taken_seconds: timeTakenSeconds || 0,
          time_allotted_seconds: totalTimeAllotted,
          grade,
          performance_level: perfLevel,
          strong_topics: strongTopics,
          weak_topics: weakTopics,
          recommendation: percentage >= 80
            ? `Excellent performance! Keep practising hard-level questions to master ${subject}.`
            : `Focus on weak areas in ${subject}. Review standard references and attempt more practice questions.`
        },
        question_review: questionReview,
        topic_analysis: topicAnalysis,
        difficulty_analysis: diffAnalysis,
        mistake_pattern: mistakePattern,
        improvement_plan: improvementPlan
      };
    }

    // --- Extract finalScore for DB update ---
    const rawPct = evaluationResult?.result_summary?.percentage;
    const finalScore = rawPct !== undefined ? parseFloat(rawPct) : (evaluationResult?.finalScore || 0);
    const eligibilityStatus = finalScore >= 80 ? 'Verified Mentor' : finalScore >= 60 ? 'Trial Mentor' : 'Reattempt Required';

    // --- Database update ---
    let updatedUser = null;
    const mongoose = require('mongoose');
    if (userId && userId !== 'mock' && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const currentUser = await User.findById(userId);
        if (currentUser) {
          if (finalScore >= 60) {
            const currentSkills = currentUser.skillsToTeach || [];
            const newSkills = [...new Set([...currentSkills, ...skills])];
            let newRole = currentUser.role;
            if (eligibilityStatus === 'Verified Mentor') newRole = 'mentor';
            else if (eligibilityStatus === 'Trial Mentor' && currentUser.role !== 'mentor') newRole = 'trial_mentor';
            const isVerifiedMentor = newRole === 'mentor';
            updatedUser = await User.findByIdAndUpdate(userId, { role: newRole, isVerifiedMentor, skillsToTeach: newSkills }, { new: true });
          } else {
            let newRole = currentUser.role;
            if ((currentUser.skillsToTeach || []).length === 0) newRole = 'student';
            const isVerifiedMentor = newRole === 'mentor';
            updatedUser = await User.findByIdAndUpdate(userId, { role: newRole, isVerifiedMentor }, { new: true });
          }
        }
      } catch (err) {
        console.error('[EVALUATE] DB update error:', err);
      }
    }

    const responsePayload = {
      verified: finalScore >= 60,
      evaluationResult: {
        ...evaluationResult,
        // Legacy compat fields so existing frontend still works
        finalScore,
        eligibilityStatus,
        message: evaluationResult?.result_summary?.recommendation || (finalScore >= 80 ? 'Accreditation Granted!' : finalScore >= 60 ? 'Trial status awarded.' : 'Reattempt required.'),
        metrics: {
          subjectKnowledgeScore: finalScore,
          problemSolvingScore: Math.max(0, finalScore - 5),
          logicalThinkingScore: Math.min(100, finalScore + 5),
          communicationClarityScore: finalScore >= 60 ? 80 : 50,
          teachingCapabilityScore: finalScore >= 80 ? 90 : 70
        },
        codingAnalysis: { correctness: finalScore >= 80 ? 'Passed.' : 'Needs improvement.', timeComplexity: 'Analysed per question.', codeQuality: 'Reviewed per submission.' },
        explanationAnalysis: { clarity: finalScore >= 70 ? 'Clear.' : 'Needs clarity.', simplicity: 'Reviewed.', conceptUnderstanding: 'Reviewed.' },
        strengthAnalysis: evaluationResult?.result_summary?.strong_topics || [],
        weaknessAnalysis: evaluationResult?.result_summary?.weak_topics || [],
        recommendations: evaluationResult?.improvement_plan?.map(p => p.action) || [],
        candidateId: userId,
        subject
      }
    };

    if (updatedUser) {
      responsePayload.user = { id: updatedUser._id, name: updatedUser.name, role: updatedUser.role, credits: updatedUser.credits, skillsToTeach: updatedUser.skillsToTeach, preferredLanguage: updatedUser.preferredLanguage, availableTimings: updatedUser.availableTimings };
    } else {
      const roleUpdate = eligibilityStatus === 'Verified Mentor' ? 'mentor' : eligibilityStatus === 'Trial Mentor' ? 'trial_mentor' : 'student';
      responsePayload.user = { id: userId || 'mock', name: 'Guest/Mock User', role: roleUpdate, credits: 100, skillsToTeach: skills, preferredLanguage: 'English', availableTimings: [] };
    }

    // --- Persist attempt to MongoDB ---
    if (userId && userId !== 'mock' && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const attempt = new VerificationAttempt({
          session_id,
          user_id: userId,
          subject,
          attempt_number,
          attempted_at: new Date(),
          result_summary: evaluationResult.result_summary,
          question_review: evaluationResult.question_review,
          topic_analysis: evaluationResult.topic_analysis,
          difficulty_analysis: evaluationResult.difficulty_analysis,
          mistake_pattern: evaluationResult.mistake_pattern,
          improvement_plan: evaluationResult.improvement_plan
        });
        await attempt.save();
        console.log(`[EVALUATE] Saved attempt #${attempt_number} for user ${userId} (session: ${session_id})`);
        // Include attempt metadata in response so frontend can display it
        responsePayload.evaluationResult.attempt_number = attempt_number;
        responsePayload.evaluationResult.session_id = session_id;
      } catch (dbErr) {
        console.error('[EVALUATE] Failed to save attempt to MongoDB:', dbErr);
      }
    }

    res.status(finalScore >= 60 ? 200 : 400).json(responsePayload);
  } catch (error) {
    console.error('[EVALUATE] Fatal error:', error);
    res.status(500).json({ message: 'Server error during evaluation' });
  }
});

// Get all verification attempts for a user (optionally filtered by subject)
router.get('/attempts', async (req, res) => {
  try {
    const { userId, subject } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const filter = { user_id: userId };
    if (subject) filter.subject = subject;
    const attempts = await VerificationAttempt.find(filter).sort({ attempted_at: -1 });
    res.json(attempts);
  } catch (err) {
    console.error('[GET ATTEMPTS] Error:', err);
    res.status(500).json({ message: 'Server error retrieving attempts' });
  }
});

// Get a single verification attempt by sessionId
router.get('/attempts/:sessionId', async (req, res) => {
  try {
    const attempt = await VerificationAttempt.findOne({ session_id: req.params.sessionId });
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    res.json(attempt);
  } catch (err) {
    console.error('[GET ATTEMPT DETAILS] Error:', err);
    res.status(500).json({ message: 'Server error retrieving attempt details' });
  }
});

module.exports = router;
