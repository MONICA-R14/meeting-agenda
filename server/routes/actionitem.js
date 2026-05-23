const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/actionitems — Get all action items for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      userId: req.user.id,
      'actionItems.0': { $exists: true }
    }).sort({ createdAt: -1 });

    // Flatten all action items from all meetings
    const allItems = [];
    meetings.forEach(meeting => {
      meeting.actionItems.forEach(item => {
        allItems.push({
          _id: item._id,
          meetingId: meeting._id,
          meetingGoal: meeting.goal,
          meetingDate: meeting.createdAt,
          task: item.task,
          assignee: item.assignee,
          deadline: item.deadline,
          completed: item.completed
        });
      });
    });

    res.status(200).json({ data: allItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/actionitems/:meetingId/:itemId — Toggle complete
router.put('/:meetingId/:itemId', authMiddleware, async (req, res) => {
  try {
    const { completed } = req.body;

    const meeting = await Meeting.findOne({
      _id: req.params.meetingId,
      userId: req.user.id
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const item = meeting.actionItems.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: 'Action item not found' });
    }

    item.completed = completed;
    meeting.markModified('actionItems');
    await meeting.save();

    res.status(200).json({
      message: 'Action item updated',
      data: item
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/actionitems/stats — Get completion stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      userId: req.user.id,
      'actionItems.0': { $exists: true }
    });

    let total = 0;
    let completed = 0;

    meetings.forEach(meeting => {
      meeting.actionItems.forEach(item => {
        total++;
        if (item.completed) completed++;
      });
    });

    res.status(200).json({
      data: {
        total,
        completed,
        pending: total - completed,
        percentage: total > 0 
          ? Math.round((completed / total) * 100) 
          : 0
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;