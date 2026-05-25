const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'cancelled', 'trial', 'classroom_active', 'disputed'], default: 'pending' },
  isTrial: { type: Boolean, default: false },
  creditCost: { type: Number, required: true },
  attendance: {
    mentorJoinedAt: { type: Date },
    studentJoinedAt: { type: Date },
    mentorLeftAt: { type: Date },
    studentLeftAt: { type: Date },
    validatedDurationMinutes: { type: Number, default: 0 }
  },
  ghostDetectionEvents: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['tab_switch', 'disconnect', 'focus_loss'] }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
