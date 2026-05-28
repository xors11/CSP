const mongoose = require('mongoose');

const VerificationAttemptSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  attempt_number: { type: Number, default: 1 },
  attempted_at: { type: Date, default: Date.now },
  result_summary: { type: Object, required: true },
  question_review: { type: Array, required: true },
  topic_analysis: { type: Array, required: true },
  difficulty_analysis: { type: Object, required: true },
  mistake_pattern: { type: Object, required: true },
  improvement_plan: { type: Array, required: true }
});

module.exports = mongoose.model('VerificationAttempt', VerificationAttemptSchema);
