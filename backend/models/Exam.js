const mongoose = require('mongoose');

const ExamSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    index: true
  },
  mentor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  questions: {
    type: Array,
    required: true
  },
  total_questions: {
    type: Number,
    required: true
  },
  time_limit_seconds: {
    type: Number,
    default: 3600
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exam', ExamSchema);
