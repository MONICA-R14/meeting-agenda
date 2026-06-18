const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const Meeting = require('../models/Meeting');
const authMiddleware = require('../middleware/authMiddleware');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are a professional Meeting Assistant AI.
You only help with meeting-related tasks.
You never respond to unrelated topics.
Always return valid JSON as specified.
Be professional and concise.`;

const CASUAL_GREETINGS = ['hi', 'hello', 'hey', 'howdy', 'how are you', 'sup', 'what\'s up', 'whats up', 'good morning', 'good afternoon', 'good evening'];

function isCasualGreeting(text) {
  const normalized = text.trim().toLowerCase().replace(/[!?.]+$/, '');
  return CASUAL_GREETINGS.includes(normalized);
}

function isMeetingTopic(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 5) return false;
  if (isCasualGreeting(text)) return false;
  return true;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// GENERATE AGENDA (Protected)
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { goal, attendees, duration } = req.body;

    console.log('--- Generate Agenda Hit ---');
    console.log('Goal:', goal);
    console.log('Attendees:', attendees);
    console.log('Duration:', duration);
    console.log('GROQ KEY exists:', !!process.env.GROQ_API_KEY);

    // Basic presence check
    if (!goal || !attendees || !duration) {
      return res.status(400).json({ message: 'Please provide goal, attendees, and duration' });
    }

    // Casual greeting check
    if (isCasualGreeting(goal)) {
      return res.status(400).json({ error: 'Please provide meeting details to generate an agenda' });
    }

    // meetingGoal must be at least 5 words
    if (!isMeetingTopic(goal)) {
      return res.status(400).json({ message: 'Please provide a proper meeting goal (at least 5 words describing the meeting topic)' });
    }

    // attendees must not be empty
    if (typeof attendees === 'string' && attendees.trim() === '') {
      return res.status(400).json({ message: 'Attendees must not be empty' });
    }
    if (Array.isArray(attendees) && attendees.length === 0) {
      return res.status(400).json({ message: 'Attendees must not be empty' });
    }

    // duration must be between 5 and 480 minutes
    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
      return res.status(400).json({ message: 'Duration must be between 5 and 480 minutes' });
    }

    console.log('Validating meeting goal with AI...');

    const validationResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a validator. Reply only with YES or NO.'
        },
        {
          role: 'user',
          content: `Is this a valid business meeting topic? Answer YES or NO only: "${goal}"`
        }
      ],
      max_tokens: 5
    });

    const validationResult = validationResponse.choices[0].message.content.trim().toUpperCase();
    console.log('AI validation result:', validationResult);

    if (validationResult.startsWith('NO')) {
      return res.status(400).json({ message: 'Please enter a valid meeting goal' });
    }

    console.log('Calling Groq API...');

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
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
    const { meetingGoal, attendees, duration, notes, language } = req.body;

    // Basic presence check
    if (!meetingGoal || !notes) {
      return res.status(400).json({
        message: 'Meeting goal and notes are required'
      });
    }

    // Casual greeting check on meetingGoal
    if (isCasualGreeting(meetingGoal)) {
      return res.status(400).json({ error: 'Please provide meeting details to generate an agenda' });
    }

    // meetingGoal must be at least 5 words
    if (!isMeetingTopic(meetingGoal)) {
      return res.status(400).json({ message: 'Please provide a proper meeting goal (at least 5 words describing the meeting topic)' });
    }

    // attendees must not be empty (if provided)
    if (attendees !== undefined) {
      if (typeof attendees === 'string' && attendees.trim() === '') {
        return res.status(400).json({ message: 'Attendees must not be empty' });
      }
      if (Array.isArray(attendees) && attendees.length === 0) {
        return res.status(400).json({ message: 'Attendees must not be empty' });
      }
    }

    // duration must be between 5 and 480 minutes (if provided)
    if (duration !== undefined) {
      const durationNum = Number(duration);
      if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
        return res.status(400).json({ message: 'Duration must be between 5 and 480 minutes' });
      }
    }

    // notes must contain actual meeting content (at least 20 words)
    if (wordCount(notes) < 20) {
      return res.status(400).json({ message: 'Please provide more detailed notes (at least 20 words) to generate a meaningful summary' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: `Based on these rough meeting notes, generate a structured
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

    const rawText = completion.choices[0].message.content;
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanText);

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
