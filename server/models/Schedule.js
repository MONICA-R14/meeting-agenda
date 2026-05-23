const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  meetingGoal: {
    type: String,
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  attendees: [
    {
      name: String,
      email: String
    }
  ],
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  meetingType: {
    type: String,
    enum: ['online', 'offline'],
    default: 'online'
  },
  platform: {
    type: String,
    enum: ['google-meet', 'teams', 'zoom', 'custom'],
    default: 'google-meet'
  },
  meetingLink: String,
  venue: String,
  agenda: String,
  remindersSent: {
    oneDay: { type: Boolean, default: false },
    oneHour: { type: Boolean, default: false },
    fifteenMin: { type: Boolean, default: false }
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  attendance: [
    {
      attendeeId: String,
      name: String,
      email: String,
      status: {
        type: String,
        enum: ['pending', 'joined', 'absent'],
        default: 'pending'
      },
      joinedAt: Date,
      token: String
    }
  ],
  attendanceFinalized: {
    type: Boolean,
    default: false
  }
  
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema);