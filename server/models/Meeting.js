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
    required: false
  },

  // Summary feature fields
  notes: String,
  summary: String,
  keyDecisions: [String],
  actionItems: [
    {
      task: String,
      assignee: String,
      deadline: String,
      completed: { type: Boolean, default: false }
    }
  ],
  nextMeetingTopics: [String]

}, { timestamps: true });



module.exports = mongoose.model('Meeting', meetingSchema);
