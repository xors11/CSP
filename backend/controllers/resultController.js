const ExamResult = require('../models/ExamResult');
const User = require('../models/User');
const mongoose = require('mongoose');

// Helper to determine the topic of a question dynamically if not provided
function getQuestionTopic(questionText, domain) {
  const text = (questionText || '').toLowerCase();
  
  // Coding subjects
  if (text.includes('loop') || text.includes('while') || text.includes('for')) return 'Loops & Control Flow';
  if (text.includes('class') || text.includes('object') || text.includes('inherit') || text.includes('polymorph') || text.includes('interface')) return 'Object-Oriented Programming';
  if (text.includes('function') || text.includes('method') || text.includes('def ')) return 'Functions & Methods';
  if (text.includes('array') || text.includes('list') || text.includes('dict') || text.includes('set') || text.includes('tree') || text.includes('graph')) return 'Data Structures';
  if (text.includes('exception') || text.includes('try') || text.includes('catch') || text.includes('throw')) return 'Exception Handling';
  if (text.includes('file') || text.includes('stream') || text.includes('io')) return 'File Input/Output';
  
  // Medical subjects
  if (text.includes('drug') || text.includes('receptor') || text.includes('pharmac') || text.includes('dose')) return 'Pharmacology & Therapeutics';
  if (text.includes('artery') || text.includes('muscle') || text.includes('nerve') || text.includes('bone') || text.includes('organ')) return 'Anatomy & Structure';
  if (text.includes('heart') || text.includes('lung') || text.includes('kidney') || text.includes('liver') || text.includes('physiol')) return 'Systemic Physiology';
  if (text.includes('bacteri') || text.includes('virus') || text.includes('infect') || text.includes('fung') || text.includes('immun')) return 'Microbiology & Immunology';
  if (text.includes('cell') || text.includes('protein') || text.includes('dna') || text.includes('rna') || text.includes('enzym')) return 'Cell Biology & Biochemistry';
  if (text.includes('patient') || text.includes('present') || text.includes('diagnos') || text.includes('symptom') || text.includes('treat')) return 'Clinical Medicine';
  
  // General fallback
  return domain || 'General Concepts';
}

exports.submitResult = async (req, res) => {
  try {
    const {
      student_id,
      exam_id,
      mentor_id,
      domain,
      questions,
      answers,
      time_taken_seconds,
      violation_count,
      auto_submitted
    } = req.body;

    if (!student_id || !domain || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'Missing required fields: student_id, domain, and questions are required.' });
    }

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    let attempted = 0;

    const topicGroups = {};
    const question_breakdown = [];

    // Evaluate each question
    questions.forEach((q) => {
      // Look up answer by q.id or q._id
      const userAns = answers ? (answers[q.id] !== undefined ? answers[q.id] : answers[q._id]) : null;
      const isSkipped = userAns === null || userAns === undefined || String(userAns).trim() === '';
      
      let isCorrect = false;

      if (isSkipped) {
        skipped++;
      } else {
        attempted++;
        // Compare answer case-insensitive trim
        const ua = String(userAns).trim().toLowerCase();
        const ca = String(q.answer || q.a || '').trim().toLowerCase();
        
        if (q.type === 'MCQ' || q.type === 'Case-Based' || q.type === 'Image-Based' || q.type === 'Fill-in-the-blank') {
          isCorrect = ua === ca;
        } else {
          // Coding/Theory/Numerical fallback (e.g. check length proxy or content)
          isCorrect = ua.length > 30;
        }

        if (isCorrect) {
          correct++;
        } else {
          wrong++;
        }
      }

      const questionText = q.question || q.q || '';
      const topicName = q.topic || getQuestionTopic(questionText, domain);

      // Group by topic
      if (!topicGroups[topicName]) {
        topicGroups[topicName] = { total: 0, correct: 0 };
      }
      topicGroups[topicName].total++;
      if (isCorrect && !isSkipped) {
        topicGroups[topicName].correct++;
      }

      question_breakdown.push({
        question_id: q.id || q._id,
        question_text: questionText,
        options: q.options || [],
        selected_answer: isSkipped ? null : String(userAns),
        correct_answer: q.answer || q.a || '',
        explanation: q.explanation || 'See standard study resources.',
        topic: topicName,
        is_correct: isCorrect,
        is_skipped: isSkipped
      });
    });

    const total_questions = questions.length;
    const score_percentage = total_questions > 0 ? Math.round((correct / total_questions) * 100) : 0;

    // Assign grade
    let grade = 'F';
    if (score_percentage >= 90) grade = 'S';
    else if (score_percentage >= 75) grade = 'A';
    else if (score_percentage >= 60) grade = 'B';
    else if (score_percentage >= 50) grade = 'C';

    // Topic performance aggregation
    const topic_performance = Object.entries(topicGroups).map(([topic, data]) => {
      const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
      
      let status = 'weak';
      if (percentage > 75) status = 'strong';
      else if (percentage >= 50) status = 'average';

      return {
        topic,
        total: data.total,
        correct: data.correct,
        percentage,
        status
      };
    });

    // Validations on ObjectId
    const cleanStudentId = mongoose.Types.ObjectId.isValid(student_id) ? new mongoose.Types.ObjectId(student_id) : null;
    const cleanExamId = mongoose.Types.ObjectId.isValid(exam_id) ? new mongoose.Types.ObjectId(exam_id) : null;
    const cleanMentorId = mongoose.Types.ObjectId.isValid(mentor_id) ? new mongoose.Types.ObjectId(mentor_id) : null;

    if (!cleanStudentId) {
      return res.status(400).json({ message: 'Invalid student_id format' });
    }

    const examResult = new ExamResult({
      student_id: cleanStudentId,
      exam_id: cleanExamId,
      mentor_id: cleanMentorId,
      domain,
      total_questions,
      attempted,
      correct,
      wrong,
      skipped,
      score_percentage,
      grade,
      time_taken_seconds: time_taken_seconds || 0,
      violation_count: violation_count || 0,
      auto_submitted: !!auto_submitted,
      topic_performance,
      question_breakdown
    });

    await examResult.save();

    // User accreditation role promotion (only runs if student is verified/takes verification exam)
    let updatedUser = null;
    try {
      const currentUser = await User.findById(cleanStudentId);
      if (currentUser) {
        if (score_percentage >= 60) {
          const currentSkills = currentUser.skillsToTeach || [];
          const newSkills = [...new Set([...currentSkills, domain])];
          
          let newRole = currentUser.role;
          if (score_percentage >= 80) newRole = 'mentor';
          else if (newRole !== 'mentor') newRole = 'trial_mentor';
          
          const isVerifiedMentor = newRole === 'mentor';
          
          updatedUser = await User.findByIdAndUpdate(
            cleanStudentId,
            { role: newRole, isVerifiedMentor, skillsToTeach: newSkills },
            { new: true }
          );
        } else {
          // If they failed and have no skills, reset to student
          let newRole = currentUser.role;
          if ((currentUser.skillsToTeach || []).length === 0) newRole = 'student';
          const isVerifiedMentor = newRole === 'mentor';
          
          updatedUser = await User.findByIdAndUpdate(
            cleanStudentId,
            { role: newRole, isVerifiedMentor },
            { new: true }
          );
        }
      }
    } catch (userErr) {
      console.error('[SUBMIT RESULT] User update error:', userErr);
    }

    const responsePayload = {
      success: true,
      result_id: examResult._id,
      score_percentage,
      grade,
      verified: score_percentage >= 60
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
    }

    res.status(200).json(responsePayload);
  } catch (err) {
    console.error('[SUBMIT RESULT] Fatal error:', err);
    res.status(500).json({ message: 'Server error processing exam submission' });
  }
};

exports.getResultById = async (req, res) => {
  try {
    const { result_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(result_id)) {
      return res.status(400).json({ message: 'Invalid result ID format' });
    }

    const result = await ExamResult.findById(result_id)
      .populate('student_id', 'name email role')
      .populate('mentor_id', 'name email role');

    if (!result) {
      return res.status(404).json({ message: 'Exam result not found' });
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('[GET RESULT BY ID] Error:', err);
    res.status(500).json({ message: 'Server error retrieving exam result' });
  }
};

exports.getStudentResults = async (req, res) => {
  try {
    const { student_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(student_id)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }

    const results = await ExamResult.find({ student_id })
      .sort({ createdAt: -1 })
      .populate('mentor_id', 'name email');

    res.status(200).json(results);
  } catch (err) {
    console.error('[GET STUDENT RESULTS] Error:', err);
    res.status(500).json({ message: 'Server error retrieving student results' });
  }
};

exports.getExamResults = async (req, res) => {
  try {
    const { exam_id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(exam_id)) {
      return res.status(400).json({ message: 'Invalid exam ID format' });
    }

    const results = await ExamResult.find({ exam_id })
      .sort({ createdAt: -1 })
      .populate('student_id', 'name email role');

    res.status(200).json(results);
  } catch (err) {
    console.error('[GET EXAM RESULTS] Error:', err);
    res.status(500).json({ message: 'Server error retrieving exam results' });
  }
};
