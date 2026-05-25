const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  type: { type: String, enum: ['request', 'accept', 'reject', 'cancel', 'reminder'], required: true },
  read: { type: Boolean, default: false },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
