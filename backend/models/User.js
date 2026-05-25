const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'trial_mentor', 'mentor'], default: 'student' },
  credits: { type: Number, default: 100 }, // Starting credits
  skillsToTeach: [{ type: String }],
  skillsToLearn: [{ type: String }],
  preferredLanguage: { type: String, default: 'English' },
  availableTimings: [{ type: String }],
  isVerifiedMentor: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  violations: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 20 } // Credits charged per hour
}, { timestamps: true });

userSchema.index({ role: 1 });
userSchema.index({ skillsToTeach: 1 });

module.exports = mongoose.model('User', userSchema);
