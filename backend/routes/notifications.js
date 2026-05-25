const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Get all notifications for the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const list = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50);
      
    res.status(200).json(list);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Mark all as read
router.put('/read-all', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ message: 'Server error marking notifications as read' });
  }
});

// Mark single notification as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    
    await Notification.updateOne(
      { _id: notificationId, recipient: userId },
      { $set: { read: true } }
    );
    
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

module.exports = router;
