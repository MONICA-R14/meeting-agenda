const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  goal: {
    type: String,
    required: true
  },
  attendees: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  agenda: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
