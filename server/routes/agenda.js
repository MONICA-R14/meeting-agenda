const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Meeting = require('../models/Meeting');
const authMiddleware = require('../middleware/authMiddleware');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// GENERATE AGENDA (Protected)
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { goal, attendees, duration } = req.body;

    console.log('--- Generate Agenda Hit ---');
    console.log('Goal:', goal);
    console.log('Attendees:', attendees);
    console.log('Duration:', duration);
    console.log('GROQ KEY exists:', !!process.env.GROQ_API_KEY);

    if (!goal || !attendees || !duration) {
      return res.status(400).json({ message: 'Please provide goal, attendees, and duration' });
    }

    console.log('Calling Groq API...');

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a professional meeting facilitator. Generate clear, structured meeting agendas with time slots.'
        },
        {
          role: 'user',
          content: 'Generate a detailed meeting agenda for: Goal: ' + goal + ', Attendees: ' + attendees + ', Duration: ' + duration + ' minutes. Format it with time slots and brief descriptions.'
        }
      ],
      max_tokens: 1024
    });

    console.log('Groq response received!');

    const agenda = response.choices[0].message.content;

    const meeting = await Meeting.create({
      userId: req.user.id,
      goal,
      attendees,
      duration,
      agenda
    });

    res.json({
      message: 'Agenda generated successfully',
      agenda,
      meetingId: meeting._id
    });

  } catch (err) {
    console.log('=== FULL ERROR ===');
    console.log(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET ALL AGENDAS
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const meetings = await Meeting.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE AGENDA
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Meeting.findByIdAndDelete(req.params.id);
    res.json({ message: 'Agenda deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
