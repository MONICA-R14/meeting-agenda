const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const { sendMeetingInvite } = require('../utils/mailer');

// POST /api/attendance/init/:scheduleId
// Initialize attendance for a meeting
// Creates unique token for each attendee
router.post('/init/:scheduleId', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.scheduleId,
      userId: req.user.id
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Create attendance record for each attendee
    schedule.attendance = schedule.attendees.map(attendee => ({
      attendeeId: attendee._id.toString(),
      name: attendee.name,
      email: attendee.email,
      status: 'pending',
      token: uuidv4()  // unique token per person
    }));

    await schedule.save();

    res.status(200).json({
      message: 'Attendance initialized',
      data: schedule.attendance
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/join/:token
// When attendee clicks join link from email
// This is PUBLIC route (no auth needed)
router.get('/join/:token', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      'attendance.token': req.params.token
    });

    if (!schedule) {
      return res.status(404).send(`
        <html>
          <head>
            <meta name="viewport" 
                  content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family:Arial,sans-serif; 
                       text-align:center; padding:50px; 
                       background:#0d0d1a; color:white;">
            <h2 style="color:#ff4444;">
              ❌ Invalid or expired attendance link
            </h2>
            <p>This link is no longer valid.</p>
          </body>
        </html>
      `);
    }

    const attendee = schedule.attendance.find(
      a => a.token === req.params.token
    );

    if (!attendee) {
      return res.status(404).send(`
        <html>
          <head>
            <meta name="viewport" 
                  content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family:Arial,sans-serif; 
                       text-align:center; padding:50px; 
                       background:#0d0d1a; color:white;">
            <h2 style="color:#ff4444;">
              ❌ Invalid or expired attendance link
            </h2>
            <p>This link is no longer valid.</p>
          </body>
        </html>
      `);
    }

    if (attendee.status === 'joined') {
      return res.send(`
        <html>
          <head>
            <meta name="viewport" 
                  content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family:Arial,sans-serif; 
                       text-align:center; padding:50px; 
                       background:#0d0d1a; color:white;">
            <h2 style="color:#c9a84c;">
              ✅ Already Marked!
            </h2>
            <p>Hi <b>${attendee.name}</b>, your attendance 
               was already recorded.</p>
          </body>
        </html>
      `);
    }

    attendee.status = 'joined';
    attendee.joinedAt = new Date();
    await schedule.save();

    if (schedule.meetingLink) {
      return res.send(`
        <html>
          <head>
            <meta name="viewport" 
                  content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px 20px;
                background: #0d0d1a;
                color: white;
              }
              .card {
                background: #16213e;
                border-radius: 16px;
                padding: 40px;
                max-width: 400px;
                margin: 0 auto;
                border: 1px solid rgba(201,168,76,0.3);
              }
              .tick {
                font-size: 60px;
                margin-bottom: 16px;
              }
              h2 { color: #c9a84c; margin-bottom: 8px; }
              p { color: #aaaaaa; }
              .time { 
                color: #6cd98e; 
                font-size: 14px; 
                margin-top: 12px; 
              }
            </style>
            <script>
              setTimeout(function () {
                window.location.href = ${JSON.stringify(schedule.meetingLink)};
              }, 3000);
            </script>
          </head>
          <body>
            <div class="card">
              <div class="tick">✅</div>
              <h2>Attendance Marked!</h2>
              <p>Hi <b style="color:white">
                 ${attendee.name}</b>,</p>
              <p>Your attendance for<br>
                 <b style="color:white">
                 ${schedule.title}</b><br>
                 has been recorded.</p>
              <p class="time">
                Marked at: ${new Date().toLocaleTimeString()}
              </p>
            </div>
          </body>
        </html>
      `);
    }

    return res.send(`
      <html>
        <head>
          <meta name="viewport" 
                content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px 20px;
              background: #0d0d1a;
              color: white;
            }
            .card {
              background: #16213e;
              border-radius: 16px;
              padding: 40px;
              max-width: 400px;
              margin: 0 auto;
              border: 1px solid rgba(201,168,76,0.3);
            }
            .tick {
              font-size: 60px;
              margin-bottom: 16px;
            }
            h2 { color: #c9a84c; margin-bottom: 8px; }
            p { color: #aaaaaa; }
            .time { 
              color: #6cd98e; 
              font-size: 14px; 
              margin-top: 12px; 
            }
          </style>
        </head>
        <body style="font-family:Arial; text-align:center; 
                     padding:50px; background:#0d0d1a; color:white;">
          <div class="card">
            <div class="tick">✅</div>
            <h2>Attendance Marked!</h2>
            <p>Hi <b style="color:white">
               ${attendee.name}</b>,</p>
            <p>Your attendance for<br>
               <b style="color:white">
               ${schedule.title}</b><br>
               has been recorded.</p>
            <p class="time">
              Marked at: ${new Date().toLocaleTimeString()}
            </p>
          </div>
        </body>
      </html>
    `);

  } catch (err) {
    return res.status(500).send(`
      <html>
        <head>
          <meta name="viewport" 
                content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family:Arial,sans-serif; 
                     text-align:center; padding:50px; 
                     background:#0d0d1a; color:white;">
          <h2 style="color:#ff4444;">❌ Error</h2>
          <p>${err.message}</p>
        </body>
      </html>
    `);
  }
});

// GET /api/attendance/:scheduleId
// Get attendance report for a meeting (admin/organizer)
router.get('/:scheduleId', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.scheduleId,
      userId: req.user.id
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const total = schedule.attendance.length;
    const joined = schedule.attendance.filter(
      a => a.status === 'joined'
    ).length;
    const absent = schedule.attendance.filter(
      a => a.status === 'absent'
    ).length;
    const pending = schedule.attendance.filter(
      a => a.status === 'pending'
    ).length;

    res.status(200).json({
      data: {
        meetingTitle: schedule.title,
        meetingDate: schedule.date,
        total,
        joined,
        absent,
        pending,
        percentage: total > 0 ? Math.round((joined / total) * 100) : 0,
        attendance: schedule.attendance
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/attendance/:scheduleId/finalize
// Mark absent for all pending attendees
// Called when meeting ends
router.put('/:scheduleId/finalize', authMiddleware, async (req, res) => {
  try {
    const schedule = await Schedule.findOne({
      _id: req.params.scheduleId,
      userId: req.user.id
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Mark all pending as absent
    schedule.attendance.forEach(attendee => {
      if (attendee.status === 'pending') {
        attendee.status = 'absent';
      }
    });

    schedule.attendanceFinalized = true;
    schedule.status = 'completed';
    await schedule.save();

    res.status(200).json({
      message: 'Attendance finalized',
      data: schedule.attendance
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/attendance/:scheduleId/manual
// Admin manually marks attendance for specific attendee
router.put('/:scheduleId/manual', authMiddleware, async (req, res) => {
  try {
    const { email, status } = req.body;

    const schedule = await Schedule.findOne({
      _id: req.params.scheduleId,
      userId: req.user.id
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const attendee = schedule.attendance.find(
      a => a.email === email
    );

    if (!attendee) {
      return res.status(404).json({ message: 'Attendee not found' });
    }

    attendee.status = status;
    if (status === 'joined') {
      attendee.joinedAt = new Date();
    }

    await schedule.save();

    res.status(200).json({
      message: 'Attendance updated',
      data: schedule.attendance
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;