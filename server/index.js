const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

// Serve Frontend
app.use(express.static(path.join(__dirname, '..', 'client')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agenda', require('./routes/agenda'));

// Test route
app.get('/api', (req, res) => {
  res.json({ message: '🚀 Meeting Agenda Builder API is running!' });
});

// Serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});