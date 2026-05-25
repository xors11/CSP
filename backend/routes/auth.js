const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, role: user.role, credits: user.credits } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    res.status(200).json({ token, user: { id: user._id, name: user.name, role: user.role, credits: user.credits } });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Current User
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ 
      user: { 
        id: user._id, 
        name: user.name, 
        role: user.role, 
        credits: user.credits,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
        preferredLanguage: user.preferredLanguage,
        availableTimings: user.availableTimings
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update Profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { preferredLanguage, availableTimings } = req.body;
    
    // Convert availableTimings string to array if needed, or just store string based on frontend
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { preferredLanguage, availableTimings },
      { new: true }
    ).select('-password');

    res.status(200).json({ 
      user: { 
        id: updatedUser._id, 
        name: updatedUser.name, 
        role: updatedUser.role, 
        credits: updatedUser.credits,
        preferredLanguage: updatedUser.preferredLanguage,
        availableTimings: updatedUser.availableTimings
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
