const mongoose = require('mongoose');

const breakdownItemSchema = new mongoose.Schema({
  points: { type: Number, required: true },
  max:    { type: Number, required: true },
  detail: { type: String, default: '' }
}, { _id: false });

const scoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  grade: {
    type: String,
    default: ''
  },
  breakdown: {
    attendance:     breakdownItemSchema,
    timeManagement: breakdownItemSchema,
    actionItems:    breakdownItemSchema,
    summary:        breakdownItemSchema,
    punctuality:    breakdownItemSchema
  },
  tip: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Score', scoreSchema);
