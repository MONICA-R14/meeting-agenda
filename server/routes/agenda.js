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
router.post('/summary', authMiddleware, async (req, res) => {
  try {
    // Step 1 - Get data
    const { meetingGoal, attendees, duration, notes,language } = req.body;

    // Step 2 - Validate
    if (!meetingGoal || !notes) {
      return res.status(400).json({ 
        message: 'Meeting goal and notes are required' 
      });
    }

    // Step 3 - Call Groq API
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `You are a professional meeting assistant. 
Based on these rough meeting notes, generate a structured 
response in valid JSON format with exactly these fields:
{
  "summary": "three sentence meeting summary",
  "keyDecisions": ["decision 1", "decision 2"],
  "actionItems": [
    { "task": "task description", "assignee": "person name", "deadline": "deadline" }
  ],
  "nextMeetingTopics": ["topic 1", "topic 2"]
}
Meeting Goal: ${meetingGoal}
Attendees: ${attendees}
Duration: ${duration} minutes
Notes: ${notes}
Generate the entire response content in ${language || 'English'} language.
Return ONLY valid JSON. No extra text. No markdown.`
        }
      ],
      max_tokens: 1000
    });

    // Step 4 - Parse response
    const rawText = completion.choices[0].message.content;
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

    // Step 5 - Save to MongoDB
    const meeting = new Meeting({
      userId: req.user.id,
      goal: meetingGoal,
      attendees: attendees,
      duration: duration,
      notes: notes,
      summary: parsed.summary,
      keyDecisions: parsed.keyDecisions,
      actionItems: parsed.actionItems,
      nextMeetingTopics: parsed.nextMeetingTopics
    });
    await meeting.save();

    // Step 6 - Return result
    res.status(200).json({
      message: 'Summary generated successfully',
      data: parsed,
      meetingId: meeting._id
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;


