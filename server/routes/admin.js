const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Team = require('../models/Team');
const Meeting = require('../models/Meeting');
const Schedule = require('../models/Schedule');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/admin/stats — Overall app statistics
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTeams = await Team.countDocuments({ 
      createdBy: req.user.id 
    });
    const totalMeetings = await Meeting.countDocuments({ 
      userId: req.user.id 
    });
    const totalScheduled = await Schedule.countDocuments({ 
      userId: req.user.id 
    });
    const completedMeetings = await Schedule.countDocuments({ 
      userId: req.user.id, 
      status: 'completed' 
    });

    // Get all action items stats
    const meetings = await Meeting.find({ 
      userId: req.user.id,
      'actionItems.0': { $exists: true }
    });

    let totalTasks = 0;
    let completedTasks = 0;
    meetings.forEach(meeting => {
      meeting.actionItems.forEach(item => {
        totalTasks++;
        if (item.completed) completedTasks++;
      });
    });

    res.status(200).json({
      data: {
        totalUsers,
        totalTeams,
        totalMeetings,
        totalScheduled,
        completedMeetings,
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users — Get all users
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({ data: users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/teams — Get all teams with member count
router.get('/teams', authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    const teamsWithCount = teams.map(team => ({
      _id: team._id,
      name: team.name,
      description: team.description,
      memberCount: team.members.length,
      createdAt: team.createdAt
    }));

    res.status(200).json({ data: teamsWithCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/meetings/recent — Get recent meetings
router.get('/meetings/recent', authMiddleware, async (req, res) => {
  try {
    const meetings = await Schedule.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('teamId', 'name');

    res.status(200).json({ data: meetings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/attendance/report — Overall attendance report
router.get('/attendance/report', authMiddleware, async (req, res) => {
  try {
    const schedules = await Schedule.find({
      userId: req.user.id,
      attendanceFinalized: true
    });

    let totalAttendees = 0;
    let totalJoined = 0;

    schedules.forEach(schedule => {
      schedule.attendance.forEach(a => {
        totalAttendees++;
        if (a.status === 'joined') totalJoined++;
      });
    });

    res.status(200).json({
      data: {
        totalMeetingsTracked: schedules.length,
        totalAttendees,
        totalJoined,
        overallPercentage: totalAttendees > 0
          ? Math.round((totalJoined / totalAttendees) * 100)
          : 0
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;