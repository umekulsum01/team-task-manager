const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await Project.find().populate('members', 'name email');
    } else {
      projects = await Project.find({ members: req.user.id }).populate('members', 'name email');
    }
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    const { name, description, members } = req.body;
    const project = await Project.create({ name, description, members, createdBy: req.user.id });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;