const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['mcq', 'coding'],
    required: true,
    index: true
  },
  q: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    default: undefined // Only present on MCQs
  },
  a: {
    type: Number,
    default: undefined // Correct answer index, only present on MCQs
  }
}, {
  timestamps: true
});

// Compound index for random aggregation queries
questionSchema.index({ subject: 1, type: 1 });

module.exports = mongoose.model('Question', questionSchema);
