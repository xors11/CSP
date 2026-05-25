const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');
const { protect } = require('../middleware/auth');

const jwt = require('jsonwebtoken');

// Get all verified/trial mentors with optional filtering
router.get('/', async (req, res) => {
  try {
    const { subject, search } = req.query;
    
    // Find users who are mentors or trial mentors and verified
    const query = { 
      role: { $in: ['mentor', 'trial_mentor'] },
      isVerifiedMentor: true
    };
    
    if (subject) {
      // Direct subject match (case-insensitive regex for flexibility)
      query.skillsToTeach = { $regex: new RegExp(subject, 'i') };
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: new RegExp(search, 'i') } },
        { skillsToTeach: { $regex: new RegExp(search, 'i') } }
      ];
    }
    
    // Attempt optional authentication for smart personalization
    let student = null;
    const authHeader = req.header('Authorization');
    if (authHeader) {
      try {
        const decoded = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret');
        student = await User.findById(decoded.userId);
      } catch (err) {
        // Continue without student context on token error
      }
    }
    
    const mentors = await User.find(query).select('-password').lean();
    
    // Dynamically query completed session count for each mentor
    const mentorsWithSessionCount = await Promise.all(
      mentors.map(async (mentor) => {
        const completedSessionsCount = await Session.countDocuments({
          mentor: mentor._id,
          status: 'completed'
        });
        
        const rating = mentor.rating || 5.0;
        const violations = mentor.violations || 0;
        const hourlyRate = mentor.hourlyRate || 20;

        // Base Rank Score: S = (10 * rating) + (4 * log10(completedSessions + 1)) - (5 * violations)
        let rankScore = (10 * rating) + (4 * Math.log10(completedSessionsCount + 1)) - (5 * violations);

        // Smart recommendation boost: Language Affinity (+10 score points)
        if (student && student.preferredLanguage && mentor.preferredLanguage &&
            student.preferredLanguage.trim().toLowerCase() === mentor.preferredLanguage.trim().toLowerCase()) {
          rankScore += 10;
        }

        // New mentor boost (if no classes taught yet, give a temporary +5 point boost to help them get started)
        if (completedSessionsCount === 0) {
          rankScore += 5;
        }

        return {
          ...mentor,
          completedSessions: completedSessionsCount,
          rankScore
        };
      })
    );

    // Sort by rank score in descending order
    mentorsWithSessionCount.sort((a, b) => b.rankScore - a.rankScore);
    
    res.status(200).json(mentorsWithSessionCount);
  } catch (error) {
    console.error('Error fetching mentors:', error);
    res.status(500).json({ message: 'Server error fetching mentors list' });
  }
});

module.exports = router;
