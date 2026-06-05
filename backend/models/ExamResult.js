const mongoose = require('mongoose');

const TopicPerformanceSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  total: { type: Number, required: true },
  correct: { type: Number, required: true },
  percentage: { type: Number, required: true },
  status: { type: String, enum: ['strong', 'average', 'weak'], required: true }
}, { _id: false });

const QuestionBreakdownSchema = new mongoose.Schema({
  question_id: { type: mongoose.Schema.Types.Mixed }, // String or Number or ObjectId depending on generation source
  question_text: { type: String, required: true },
  options: { type: [String], default: undefined },
  selected_answer: { type: String, default: null },
  correct_answer: { type: String, required: true },
  explanation: { type: String, default: '' },
  topic: { type: String, required: true },
  is_correct: { type: Boolean, default: false },
  is_skipped: { type: Boolean, default: false }
}, { _id: false });

const ExamResultSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  exam_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: false,
    index: true
  },
  mentor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  },
  domain: {
    type: String,
    required: true,
    index: true
  },
  total_questions: {
    type: Number,
    required: true
  },
  attempted: {
    type: Number,
    required: true
  },
  correct: {
    type: Number,
    required: true
  },
  wrong: {
    type: Number,
    required: true
  },
  skipped: {
    type: Number,
    required: true
  },
  score_percentage: {
    type: Number,
    required: true
  },
  grade: {
    type: String,
    enum: ['S', 'A', 'B', 'C', 'F'],
    required: true
  },
  time_taken_seconds: {
    type: Number,
    required: true
  },
  violation_count: {
    type: Number,
    default: 0
  },
  auto_submitted: {
    type: Boolean,
    default: false
  },
  topic_performance: [TopicPerformanceSchema],
  question_breakdown: [QuestionBreakdownSchema]
}, {
  timestamps: true // This automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('ExamResult', ExamResultSchema);
