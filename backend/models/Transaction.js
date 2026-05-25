const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  credits: { type: Number, required: true },
  status: { type: String, enum: ['escrowed', 'disbursed', 'refunded'], default: 'escrowed' },
  reference: { type: String, enum: ['session_booking', 'session_completion', 'session_cancellation'], required: true }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
