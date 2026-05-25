const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// Get all sessions for the logged-in user (as student or mentor)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const sessions = await Session.find({
      $or: [{ student: userId }, { mentor: userId }]
    })
      .populate('student', 'name email role')
      .populate('mentor', 'name email role')
      .sort({ scheduledAt: -1 });
      
    res.status(200).json(sessions);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ message: 'Server error fetching sessions' });
  }
});

// Book a new session (Hold credits in escrow)
router.post('/book', protect, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { mentorId, subject, scheduledAt, durationMinutes = 60, isTrial = false } = req.body;
    
    if (studentId === mentorId) {
      return res.status(400).json({ message: 'You cannot book a session with yourself' });
    }
    
    // Verify mentor exists and has correct roles
    const mentor = await User.findById(mentorId);
    if (!mentor || !['mentor', 'trial_mentor'].includes(mentor.role)) {
      return res.status(400).json({ message: 'Selected user is not a certified mentor' });
    }
    
    let creditCost = 0;
    
    if (isTrial) {
      // Verify that no trial session already exists between this student and mentor
      const trialExists = await Session.findOne({ student: studentId, mentor: mentorId, isTrial: true });
      if (trialExists) {
        return res.status(400).json({ message: 'You have already used your free trial session with this mentor' });
      }
    } else {
      // Calculate cost based on duration and rate
      const hourlyRate = mentor.hourlyRate || 20;
      creditCost = Math.round(hourlyRate * (durationMinutes / 60));
      
      // Verify student credits
      const student = await User.findById(studentId);
      if (!student || student.credits < creditCost) {
        return res.status(400).json({ message: `Insufficient credits. You need ${creditCost} credits, but you only have ${student ? student.credits : 0}.` });
      }
    }
    
    // Validate scheduling in the future
    const appointmentTime = new Date(scheduledAt);
    if (appointmentTime.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Scheduled time must be in the future' });
    }
    
    // Check for overlaps (either mentor or student is busy at this time)
    const bufferTime = durationMinutes * 60 * 1000;
    const startMs = appointmentTime.getTime();
    const conflict = await Session.findOne({
      status: { $in: ['pending', 'accepted'] },
      $or: [
        { mentor: mentorId },
        { student: studentId }
      ],
      scheduledAt: {
        $gt: new Date(startMs - bufferTime),
        $lt: new Date(startMs + bufferTime)
      }
    });
    
    if (conflict) {
      return res.status(400).json({ message: 'Scheduling conflict detected: Student or Mentor has another session scheduled during this time slot.' });
    }
    
    // Create Session
    const session = new Session({
      mentor: mentorId,
      student: studentId,
      subject,
      scheduledAt: appointmentTime,
      durationMinutes,
      status: 'pending',
      creditCost,
      isTrial
    });
    await session.save();
    
    // Deduct student credits if it is a paid session
    let student = null;
    if (!isTrial) {
      student = await User.findById(studentId);
      student.credits -= creditCost;
      await student.save();
      
      // Save Transaction
      const transaction = new Transaction({
        session: session._id,
        student: studentId,
        mentor: mentorId,
        credits: creditCost,
        status: 'escrowed',
        reference: 'session_booking'
      });
      await transaction.save();
    } else {
      student = await User.findById(studentId);
    }
    
    // Log Notification for mentor
    const alertMessage = `${student.name} requested a ${durationMinutes}-minute ${isTrial ? 'FREE Trial' : 'paid'} session for "${subject}" on ${appointmentTime.toLocaleString()}.`;
    const notification = new Notification({
      recipient: mentorId,
      sender: studentId,
      message: alertMessage,
      type: 'request',
      session: session._id
    });
    await notification.save();
    
    // Dispatch Real-time Notification via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${mentorId}`).emit('new-notification', {
        id: notification._id,
        message: alertMessage,
        type: 'request',
        session: {
          _id: session._id,
          subject,
          scheduledAt: session.scheduledAt,
          creditCost,
          isTrial
        },
        senderName: student.name
      });
    }
    
    res.status(201).json({
      message: isTrial 
        ? 'Free trial session requested successfully.'
        : 'Session requested successfully and credits held in escrow.',
      session,
      creditsRemaining: student.credits
    });
  } catch (error) {
    console.error('Error booking session:', error);
    res.status(500).json({ message: 'Server error booking session' });
  }
});

// Update session status (Accept / Reject / Cancel)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const sessionId = req.params.id;
    const { status } = req.body; // 'accepted' or 'cancelled'
    
    if (!['accepted', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status request. Must be "accepted" or "cancelled".' });
    }
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const isMentor = session.mentor.toString() === userId;
    const isStudent = session.student.toString() === userId;
    
    if (!isMentor && !isStudent) {
      return res.status(401).json({ message: 'Not authorized to manage this session' });
    }
    
    const io = req.app.get('io');
    
    // ACCEPT flow
    if (status === 'accepted') {
      if (!isMentor) {
        return res.status(400).json({ message: 'Only the mentor can accept booking requests.' });
      }
      
      if (session.status !== 'pending') {
        return res.status(400).json({ message: `Cannot accept a session that is already ${session.status}.` });
      }
      
      session.status = 'accepted';
      await session.save();
      
      // Get participant profiles
      const mentorUser = await User.findById(session.mentor);
      
      // Credits remain held in escrow (escrow transaction is created on book)
      // Notify student
      const alertMsg = `Your session request for "${session.subject}" has been accepted by ${mentorUser.name}!`;
      const notification = new Notification({
        recipient: session.student,
        sender: userId,
        message: alertMsg,
        type: 'accept',
        session: session._id
      });
      await notification.save();
      
      if (io) {
        io.to(`user-${session.student}`).emit('new-notification', {
          id: notification._id,
          message: alertMsg,
          type: 'accept',
          session: session
        });
      }
      
      return res.status(200).json({ message: 'Session accepted successfully', session });
    }
    
    // CANCEL flow (Rejection or cancellation)
    if (status === 'cancelled') {
      if (session.status === 'completed' || session.status === 'cancelled') {
        return res.status(400).json({ message: `Cannot cancel a session that is already ${session.status}.` });
      }
      
      const oldStatus = session.status;
      session.status = 'cancelled';
      await session.save();
      
      // Refund Student credits if they were deducted (and not a free trial)
      if (!session.isTrial) {
        const studentUser = await User.findById(session.student);
        studentUser.credits += session.creditCost;
        await studentUser.save();
        
        // Update Transaction
        await Transaction.findOneAndUpdate(
          { session: session._id, status: 'escrowed' },
          { status: 'refunded', reference: 'session_cancellation' }
        );
      }
      
      // Get canceler's name
      const canceler = await User.findById(userId);
      const notifyRecipient = isMentor ? session.student : session.mentor;
      
      const alertMsg = `The session for "${session.subject}" was cancelled by ${canceler.name}.`;
      const notification = new Notification({
        recipient: notifyRecipient,
        sender: userId,
        message: alertMsg,
        type: 'cancel',
        session: session._id
      });
      await notification.save();
      
      if (io) {
        io.to(`user-${notifyRecipient}`).emit('new-notification', {
          id: notification._id,
          message: alertMsg,
          type: 'cancel',
          session: session
        });
      }
      
      return res.status(200).json({ message: 'Session cancelled successfully and credits refunded.', session });
    }
    
  } catch (error) {
    console.error('Error updating session status:', error);
    res.status(500).json({ message: 'Server error updating session' });
  }
});

// Gateway Handshake Route
router.post('/:id/handshake', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    const isStudent = session.student.toString() === userId;
    const isMentor = session.mentor.toString() === userId;
    if (!isStudent && !isMentor) {
      return res.status(403).json({ message: 'Unauthorized to join this session' });
    }
    
    if (!['accepted', 'classroom_active'].includes(session.status)) {
      return res.status(400).json({ message: 'Session has not been accepted or is already closed' });
    }
    
    // Calculate timing validation (allow joining 15 minutes early and up to 2 hours after start)
    const now = Date.now();
    const startTime = new Date(session.scheduledAt).getTime();
    const endTime = startTime + (session.durationMinutes * 60 * 1000);
    
    if (now < startTime - (15 * 60 * 1000)) {
      return res.status(400).json({ message: 'Classroom is not open yet. You can join up to 15 minutes before the scheduled time.' });
    }
    
    if (now > endTime + (60 * 60 * 1000)) {
      return res.status(400).json({ message: 'Classroom has expired and is closed.' });
    }
    
    // Issue Classroom token
    const token = jwt.sign(
      { userId, role: isMentor ? 'mentor' : 'student', sessionId: session._id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '3h' }
    );
    
    // Transition session status to classroom_active if it was accepted
    if (session.status === 'accepted') {
      session.status = 'classroom_active';
      await session.save();
    }
    
    res.status(200).json({ token, roomId: `room-${session._id}` });
  } catch (err) {
    console.error('Handshake error:', err);
    res.status(500).json({ message: 'Server error during handshake' });
  }
});

// Complete Session Route (Disbursing Credits / Disputes)
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const userId = req.user.userId;
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    const isStudent = session.student.toString() === userId;
    const isMentor = session.mentor.toString() === userId;
    if (!isStudent && !isMentor) {
      return res.status(403).json({ message: 'Unauthorized to complete this session' });
    }
    
    if (session.status === 'completed') {
      return res.status(200).json({ message: 'Session already completed', session });
    }
    
    // Mark attendance leaves if not already recorded
    if (isMentor && !session.attendance.mentorLeftAt) {
      session.attendance.mentorLeftAt = new Date();
    }
    if (isStudent && !session.attendance.studentLeftAt) {
      session.attendance.studentLeftAt = new Date();
    }
    
    // Calculate attendance duration (co-presence overlap)
    const mJoin = session.attendance.mentorJoinedAt;
    const mLeave = session.attendance.mentorLeftAt || new Date();
    const sJoin = session.attendance.studentJoinedAt;
    const sLeave = session.attendance.studentLeftAt || new Date();
    
    if (!mJoin || !sJoin) {
      // One of the participants did not join, so duration is 0
      session.attendance.validatedDurationMinutes = 0;
    } else {
      const overlapStart = Math.max(mJoin.getTime(), sJoin.getTime());
      const overlapEnd = Math.min(mLeave.getTime(), sLeave.getTime());
      const overlapMs = Math.max(0, overlapEnd - overlapStart);
      session.attendance.validatedDurationMinutes = Math.round(overlapMs / (60 * 1000));
    }
    
    const scheduledDuration = session.durationMinutes;
    const threshold = scheduledDuration * 0.8; // 80% attendance threshold
    
    if (session.isTrial) {
      session.status = 'completed';
      await session.save();
      return res.status(200).json({ message: 'Trial session completed successfully', session });
    }
    
    if (session.attendance.validatedDurationMinutes >= threshold) {
      session.status = 'completed';
      await session.save();
      
      // Disburse credits from escrow to mentor
      const mentor = await User.findById(session.mentor);
      mentor.credits += session.creditCost;
      await mentor.save();
      
      // Update Transaction
      await Transaction.findOneAndUpdate(
        { session: session._id, status: 'escrowed' },
        { status: 'disbursed', reference: 'session_completion' }
      );
      
      return res.status(200).json({ message: 'Session completed successfully. Credits disbursed.', session });
    } else {
      // Attendance below threshold, flag as disputed
      session.status = 'disputed';
      await session.save();
      
      return res.status(200).json({ 
        message: `Session flagged as disputed due to low attendance (${session.attendance.validatedDurationMinutes} mins active, scheduled ${scheduledDuration} mins). Admin will review.`, 
        session 
      });
    }
  } catch (err) {
    console.error('Session complete error:', err);
    res.status(500).json({ message: 'Server error completing session' });
  }
});

// Submit Review and Update ratings/sessions count
router.post('/:id/review', protect, async (req, res) => {
  try {
    const studentId = req.user.userId;
    const sessionId = req.params.id;
    const { rating, comment, attributes } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    if (session.student.toString() !== studentId) {
      return res.status(403).json({ message: 'Only the student can submit reviews.' });
    }
    
    // Create Review
    const review = new Review({
      session: sessionId,
      student: studentId,
      mentor: session.mentor,
      rating,
      comment,
      isTrialEvaluation: session.isTrial,
      attributes
    });
    await review.save();
    
    // Recalculate mentor rating and completed sessions count
    const mentor = await User.findById(session.mentor);
    const allReviews = await Review.find({ mentor: session.mentor });
    const totalReviews = allReviews.length;
    const sumRatings = allReviews.reduce((sum, r) => sum + r.rating, 0);
    
    mentor.totalReviews = totalReviews;
    mentor.rating = Math.round((sumRatings / totalReviews) * 10) / 10;
    
    if (session.status === 'completed') {
      mentor.completedSessions = (mentor.completedSessions || 0) + 1;
    }
    await mentor.save();
    
    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (err) {
    console.error('Review submission error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You have already reviewed this session.' });
    }
    res.status(500).json({ message: 'Server error submitting review' });
  }
});

module.exports = router;
