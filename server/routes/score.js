const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Score = require('../models/Score');
const Schedule = require('../models/Schedule');
const Meeting = require('../models/Meeting');
const authMiddleware = require('../middleware/authMiddleware');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGrade(score) {
  if (score >= 9)   return 'A+';
  if (score >= 8)   return 'A';
  if (score >= 7)   return 'B+';
  if (score >= 6)   return 'B';
  if (score >= 5)   return 'C';
  return 'D';
}

// ── POST /api/score/calculate ─────────────────────────────────────────────────
router.post('/calculate', authMiddleware, async (req, res) => {
  try {
    const { scheduleId, actualDuration, startedOnTime } = req.body;

    if (!scheduleId) {
      return res.status(400).json({ message: 'scheduleId is required' });
    }

    const schedule = await Schedule.findOne({
      _id: scheduleId,
      userId: req.user.id
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Guard: attendance must be finalized before scoring
    if (!schedule.attendanceFinalized) {
      return res.status(400).json({
        message: 'Initialize attendance first before calculating score'
      });
    }

    // ── 1. ATTENDANCE SCORE (0-3) ──────────────────────────────────────────
    const totalAttendees = schedule.attendance.length;
    let attendancePoints = 0;
    let attendanceDetail = 'No attendance data';

    if (totalAttendees > 0) {
      const joined = schedule.attendance.filter(a => a.status === 'joined').length;
      const pct = Math.round((joined / totalAttendees) * 100);
      attendanceDetail = `${pct}% attended (${joined}/${totalAttendees})`;
      if (pct === 100)       attendancePoints = 3;
      else if (pct >= 80)    attendancePoints = 2;
      else if (pct >= 60)    attendancePoints = 1;
    }

    // ── 2. TIME MANAGEMENT SCORE (0-2) ────────────────────────────────────
    let timePoints = 0;
    let timeDetail = 'No actual duration provided';
    const planned = Number(schedule.duration) || 0;
    const actual  = Number(actualDuration) || 0;

    if (actual > 0 && planned > 0) {
      const diff = Math.abs(actual - planned);
      timeDetail = `Planned ${planned} min, actual ${actual} min`;
      if (diff <= 5)        timePoints = 2;
      else if (diff <= 15)  timePoints = 1;
    }

    // ── 3. ACTION ITEMS SCORE (0-2) ───────────────────────────────────────
    let actionPoints = 0;
    let actionDetail = 'No summary found';

    const meeting = await Meeting.findOne({
      userId: req.user.id,
      goal: schedule.meetingGoal
    }).sort({ createdAt: -1 });

    if (meeting && Array.isArray(meeting.actionItems)) {
      const count = meeting.actionItems.length;
      actionDetail = `${count} action item${count !== 1 ? 's' : ''} set`;
      if (count >= 3)      actionPoints = 2;
      else if (count >= 1) actionPoints = 1;
    }

    // ── 4. SUMMARY SCORE (0-2) ────────────────────────────────────────────
    let summaryPoints = 0;
    let summaryDetail = 'No summary found';

    if (meeting && meeting.summary) {
      const wordCount = meeting.summary.trim().split(/\s+/).length;
      if (wordCount >= 50) {
        summaryPoints = 2;
        summaryDetail = `Summary present (${wordCount} words)`;
      } else {
        summaryPoints = 1;
        summaryDetail = `Summary too short (${wordCount} words)`;
      }
    }

    // ── 5. PUNCTUALITY SCORE (0-1) ────────────────────────────────────────
    const punctualityPoints = startedOnTime === true ? 1 : 0;
    const punctualityDetail = startedOnTime === true ? 'Started on time' : 'Started late';

    // ── Total ─────────────────────────────────────────────────────────────
    const total = attendancePoints + timePoints + actionPoints + summaryPoints + punctualityPoints;
    const grade = getGrade(total);

    const breakdown = {
      attendance:     { points: attendancePoints,  max: 3, detail: attendanceDetail  },
      timeManagement: { points: timePoints,         max: 2, detail: timeDetail        },
      actionItems:    { points: actionPoints,       max: 2, detail: actionDetail      },
      summary:        { points: summaryPoints,      max: 2, detail: summaryDetail     },
      punctuality:    { points: punctualityPoints,  max: 1, detail: punctualityDetail }
    };

    // ── AI Tip ────────────────────────────────────────────────────────────
    let tip = '';
    try {
      const breakdownText = Object.entries(breakdown)
        .map(([k, v]) => `${k}: ${v.points}/${v.max} (${v.detail})`)
        .join(', ');

      const tipRes = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a professional meeting coach. Give concise, actionable advice.'
          },
          {
            role: 'user',
            content: `Based on this meeting score breakdown: ${breakdownText}, give one specific tip to improve future meetings. Keep it under 30 words.`
          }
        ],
        max_tokens: 60
      });
      tip = tipRes.choices[0].message.content.trim();
    } catch (_) {
      tip = 'Review your meeting notes and action items after every session to stay on track.';
    }

    // ── Save to DB ────────────────────────────────────────────────────────
    const scoreDoc = await Score.create({
      userId: req.user.id,
      scheduleId,
      score: total,
      grade,
      breakdown,
      tip
    });

    res.status(200).json({
      score: total,
      grade,
      breakdown,
      tip,
      scoreId: scoreDoc._id
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/score/history ────────────────────────────────────────────────────
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const scores = await Score.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('scheduleId', 'title date');

    res.status(200).json({ data: scores });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── GET /api/score/stats ──────────────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const scores = await Score.find({ userId: req.user.id }).sort({ createdAt: 1 });

    if (!scores.length) {
      return res.status(200).json({
        data: {
          averageScore: 0,
          totalMeetingsScored: 0,
          bestScore: 0,
          worstScore: 0,
          trend: 'stable'
        }
      });
    }

    const values = scores.map(s => s.score);
    const avg    = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
    const best   = Math.max(...values);
    const worst  = Math.min(...values);

    // Trend: compare average of last 3 vs previous 3
    let trend = 'stable';
    if (values.length >= 6) {
      const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const prev   = values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      if (recent > prev + 0.5)       trend = 'improving';
      else if (recent < prev - 0.5)  trend = 'declining';
    }

    res.status(200).json({
      data: {
        averageScore: avg,
        totalMeetingsScored: scores.length,
        bestScore: best,
        worstScore: worst,
        trend
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
