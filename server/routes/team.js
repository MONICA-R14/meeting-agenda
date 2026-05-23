const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/team — Create new team
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const team = new Team({
      name,
      description,
      createdBy: req.user.id,
      members: []
    });

    await team.save();
    res.status(201).json({ message: 'Team created successfully', data: team });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/team — Get all teams created by user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const teams = await Team.find({ createdBy: req.user.id });
    res.status(200).json({ data: teams });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/team/:id — Get single team with members
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.status(200).json({ data: team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/team/:id/members — Add member to team
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if email already exists in team
    const exists = team.members.find(m => m.email === email);
    if (exists) {
      return res.status(400).json({ message: 'Member already exists in team' });
    }

    team.members.push({ name, email, role: role || 'member' });
    await team.save();

    res.status(200).json({ message: 'Member added successfully', data: team });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/team/:id/members/:memberId — Update member details
router.put('/:id/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const { name, email, role } = req.body;

    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const member = team.members.id(req.params.memberId);
    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (name) member.name = name;
    if (email) member.email = email;
    if (role) member.role = role;

    await team.save();
    res.status(200).json({ message: 'Member updated successfully', data: team });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/team/:id/members/:memberId — Remove member from team
router.delete('/:id/members/:memberId', authMiddleware, async (req, res) => {
  try {
    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    team.members = team.members.filter(
      m => m._id.toString() !== req.params.memberId
    );

    await team.save();
    res.status(200).json({ message: 'Member removed successfully', data: team });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/team/:id — Delete entire team
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ message: 'Team name cannot be empty' });
    }

    const team = await Team.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (name !== undefined) team.name = name.trim();
    if (description !== undefined) team.description = description;

    await team.save();
    res.status(200).json({ message: 'Team updated successfully', data: team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/team/:id — Delete entire team
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Team.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.id
    });

    res.status(200).json({ message: 'Team deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;