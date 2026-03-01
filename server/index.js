const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Add this after app.use(express.json());
app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/agenda', require('./routes/agenda'));

// Test route
app.get('/', (req, res) => {
  res.json({ message: '🚀 Meeting Agenda Builder API is running!' });
});

// MongoDB Connect
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
