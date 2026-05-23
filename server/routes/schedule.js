const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Team = require('../models/Team');
const authMiddleware = require('../middleware/authMiddleware');
const { sendMeetingInvite } = require('../utils/mailer');

// POST /api/schedule — Create new meeting
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title, meetingGoal, teamId,
      attendees, date, duration,
      meetingType, platform,
      meetingLink, venue, agenda
    } = req.body;

    if (!title || !meetingGoal || !date || !duration) {
      return res.status(400).json({
        message: 'Title, goal, date and duration are required'
      });
    }

    // If team selected, load team members
    let finalAttendees = attendees || [];
    if (teamId) {
      const team = await Team.findById(teamId);
      if (team) {
        // Merge team members with any extra attendees
        const teamEmails = team.members.map(m => m.email);
        const extraAttendees = finalAttendees.filter(
          a => !teamEmails.includes(a.email)
        );
        finalAttendees = [...team.members, ...extraAttendees];
      }
    }

    const schedule = new Schedule({
      userId: req.user.id,
      title, meetingGoal, teamId,
      attendees: finalAttendees,
      date, duration, meetingType,
      platform, meetingLink, venue, agenda
    });

    // Auto generate meeting link if online and no custom link provided
    if (meetingType === 'online' && !meetingLink) {
      const tempId = Date.now().toString(36).toUpperCase();
      schedule.meetingLink = generateMeetingLink(platform, tempId);
    }

    await schedule.save();

    // Send invite emails to all attendees
    for (const attendee of finalAttendees) {
      if (attendee.email) {
        await sendMeetingInvite(attendee, schedule);
      }
    }

    res.status(201).json({
      message: 'Meeting scheduled and invites sent!',
      data: schedule
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/schedule — Get all meetings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.user.id })
      .populate('teamId', 'name')
      .sort({ date: 1 });

    res.status(200).json({ data: schedules });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/schedule/:id — Get single meeting
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).populate('teamId', 'name');

    if (!schedule) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.status(200).json({ data: schedule });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/schedule/:id/status — Update meeting status
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status },
      { new: true }
    );

    res.status(200).json({
      message: 'Status updated',
      data: schedule
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/schedule/:id/reschedule — Update meeting date/time
router.put('/:id/reschedule', authMiddleware, async (req, res) => {
  try {
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'New date is required' });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { date: parsedDate },
      { new: true }
    ).populate('teamId', 'name');

    if (!schedule) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    res.status(200).json({
      message: 'Meeting rescheduled successfully',
      data: schedule
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/schedule/:id — Delete meeting
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Schedule.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    res.status(200).json({ message: 'Meeting deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function generateMeetingLink(platform, meetingId) {
  switch (platform) {
    case 'google-meet':
      // Generate a Google Meet style link
      // Real integration needs OAuth - use Jitsi instead
      return `https://meet.jit.si/AIMeetingAssistant-${meetingId}`;

    case 'teams':
      return `https://meet.jit.si/AIMeetingAssistant-Teams-${meetingId}`;

    case 'zoom':
      return `https://meet.jit.si/AIMeetingAssistant-Zoom-${meetingId}`;

    case 'custom':
      return null; // user provides their own link

    default:
      return `https://meet.jit.si/AIMeetingAssistant-${meetingId}`;
  }
}

module.exports = router;