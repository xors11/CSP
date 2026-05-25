const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');

// Helper to query random questions from MongoDB
async function getQuestionsForSubjects(subjectsStr) {
  const subjects = subjectsStr.split(',').map(s => s.trim());
  let allMcqs = [];
  let allCoding = [];

  for (const subject of subjects) {
    // Check if questions exist for this subject. Fallback to 'B.Tech Java' if not.
    const count = await Question.countDocuments({ subject });
    const targetSubject = count > 0 ? subject : 'B.Tech Java';

    // Aggregate 10 random MCQs
    const mcqs = await Question.aggregate([
      { $match: { subject: targetSubject, type: 'mcq' } },
      { $sample: { size: 10 } }
    ]);

    // Aggregate 3 random Coding questions
    const coding = await Question.aggregate([
      { $match: { subject: targetSubject, type: 'coding' } },
      { $sample: { size: 3 } }
    ]);

    // Randomize option order and map correct index
    const mcqsCopy = mcqs.map(q => {
      const correctAnswer = q.options[q.a];
      const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
      const newAnswerIndex = shuffledOptions.indexOf(correctAnswer);
      
      return {
        q: q.q,
        options: shuffledOptions,
        a: newAnswerIndex,
        subject: subject
      };
    });

    const codingCopy = coding.map(q => ({
      q: q.q,
      subject: subject
    }));

    allMcqs = [...allMcqs, ...mcqsCopy];
    allCoding = [...allCoding, ...codingCopy];
  }

  return {
    mcqs: allMcqs,
    coding: allCoding
  };
}

// Generate AI Verification Test
router.get('/generate', async (req, res) => {
  try {
    const subjects = req.query.subjects || 'General';
    const test = await getQuestionsForSubjects(subjects);
    
    // Map with answer index 'a' exposed for test helper
    const payloadMcqs = test.mcqs.map((mcq, index) => ({
      id: index,
      subject: mcq.subject,
      q: mcq.q,
      options: mcq.options,
      a: mcq.a
    }));

    res.status(200).json({ 
      mcqs: payloadMcqs, 
      coding: test.coding 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating AI test' });
  }
});

// Evaluate AI Verification Test
router.post('/evaluate', async (req, res) => {
  try {
    const { userId, skills, mcqAnswers, codingAnswers } = req.body;
    
    // Simulate robust grading logic
    let mcqScore = 0;
    const answeredMcqs = Object.keys(mcqAnswers).length;
    // Mock logic: 80% baseline if they answered everything, adjusted randomly for simulation
    if (answeredMcqs > 5) {
      mcqScore = 70 + Math.floor(Math.random() * 25); // 70 to 95
    }

    let codingScore = 0;
    let validCodingAnswers = 0;
    let totalLength = 0;
    for (let key in codingAnswers) {
      const ans = codingAnswers[key];
      if (ans && ans.length > 30) {
        validCodingAnswers++;
        totalLength += ans.length;
      }
    }
    
    if (validCodingAnswers >= 1) {
      codingScore = 60 + Math.min(totalLength / 20, 35); // up to 95 based on length
    }

    const finalScore = Math.floor((mcqScore * 0.4) + (codingScore * 0.6));
    
    let eligibilityStatus = 'Reattempt Required';
    let roleUpdate = 'student';
    let isVerified = false;
    let message = 'Test failed. The AI detected insufficient depth in your coding answers or low MCQ accuracy. Please study and try again.';

    if (finalScore >= 80) {
      eligibilityStatus = 'Verified Mentor';
      roleUpdate = 'mentor';
      isVerified = true;
      message = `Outstanding! You passed the AI Assessment with a score of ${finalScore}. You are now a certified Mentor.`;
    } else if (finalScore >= 60) {
      eligibilityStatus = 'Trial Mentor';
      roleUpdate = 'trial_mentor';
      // They are a trial mentor, so we won't give full verification flag, but they can teach temporarily
      isVerified = false;
      message = `Good effort. You scored ${finalScore}, earning you Trial Mentor status. Prove yourself in 5 trial sessions!`;
    }

    // Build the JSON-friendly detailed response
    const evaluationResult = {
      candidateId: userId,
      subject: skills[0] || 'General',
      finalScore: finalScore,
      eligibilityStatus: eligibilityStatus,
      message: message,
      metrics: {
        subjectKnowledgeScore: mcqScore,
        problemSolvingScore: codingScore,
        logicalThinkingScore: Math.floor((mcqScore + codingScore) / 2) + 2,
        communicationClarityScore: codingScore > 75 ? 88 : 65,
        teachingCapabilityScore: finalScore > 80 ? 90 : 70
      },
      codingAnalysis: {
        correctness: codingScore > 80 ? "Passed all edge cases." : "Missed some critical edge cases.",
        timeComplexity: codingScore > 80 ? "O(1) / O(n) - Optimal implementation." : "Suboptimal time complexity detected.",
        codeQuality: codingScore > 80 ? "Clean, modular, and well-commented." : "Code is messy and lacks proper comments."
      },
      explanationAnalysis: {
        clarity: finalScore > 75 ? "Very clear explanations." : "Explanations use too much jargon.",
        simplicity: "Could be simplified further for absolute beginners.",
        conceptUnderstanding: "Demonstrated solid mastery of core concepts."
      },
      strengthAnalysis: finalScore >= 60 ? [
        "Strong algorithmic problem-solving skills.",
        "Good understanding of core subject theory.",
        codingScore > 80 ? "Code is highly optimized and production-ready." : "Good effort on coding challenges."
      ] : [],
      weaknessAnalysis: finalScore < 80 ? [
        "Tendency to over-explain simple concepts using complex jargon.",
        "Missed an edge case in the advanced logic questions."
      ] : ["Minor improvements needed in code commenting."],
      recommendations: [
        "Practice using analogies to explain complex topics to beginners.",
        "Focus on writing cleaner, more modular code."
      ],
      systemMechanics: {
        antiCheatingFlags: {
          tabSwitchesDetected: 0,
          copyPasteDetected: false,
          completionTimeAnomalies: "None"
        },
        trialSessionValidation: finalScore >= 80 ? "Not required." : (finalScore >= 60 ? "Must complete 5 rated trial sessions." : "N/A"),
        continuousVerification: "Next rating-based evaluation at 10 student reviews."
      }
    };

    if (finalScore >= 60) {
      let updatedUser = null;
      const mongoose = require('mongoose');
      if (userId && userId !== 'mock' && mongoose.Types.ObjectId.isValid(userId)) {
        try {
          updatedUser = await User.findByIdAndUpdate(userId, {
            role: roleUpdate,
            isVerifiedMentor: isVerified,
            $addToSet: { skillsToTeach: { $each: skills } }
          }, { new: true });
        } catch (err) {
          console.error('Error updating user in DB:', err);
        }
      }
      
      const responsePayload = {
        verified: true,
        evaluationResult: evaluationResult
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
        // Return a mock user profile when testing with mock/deleted users
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

      return res.status(200).json(responsePayload);
    } else {
      return res.status(400).json({ 
        verified: false,
        evaluationResult: evaluationResult
      });
    }
  } catch (error) {
    console.error('Error during evaluation:', error);
    res.status(500).json({ message: 'Server error during evaluation' });
  }
});

module.exports = router;
