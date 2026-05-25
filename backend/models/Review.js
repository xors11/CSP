const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 },
  isTrialEvaluation: { type: Boolean, default: false },
  attributes: {
    punctuality: { type: Number, min: 1, max: 5 },
    communication: { type: Number, min: 1, max: 5 },
    subjectKnowledge: { type: Number, min: 1, max: 5 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
