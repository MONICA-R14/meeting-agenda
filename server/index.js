require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { startReminderCron } = require('./utils/reminderCron');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

// Serve Frontend (client folder inside server)
app.use(express.static(path.join(__dirname, 'client')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agenda', require('./routes/agenda'));
app.use('/api/team', require('./routes/team'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/actionitems', require('./routes/actionitem'));
app.use('/api/admin', require('./routes/admin'));

// Test route
app.get('/api', (req, res) => {
  res.json({ message: '🚀 Meeting Agenda Builder API is running!' });
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    startReminderCron();
  })
  .catch(err => console.log('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
