const express = require('express');
const router = express.Router();
const Resume = require('../models/Resume');

// Get all resumes
router.get('/', async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ uploadDate: -1 });
    res.json({ success: true, data: resumes });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new resume
router.post('/', async (req, res) => {
  try {
    const resumeData = {
      ...req.body,
      userId: req.user.id
    };

    // Validate required fields
    if (!resumeData.name || !resumeData.version || !resumeData.fileName || !resumeData.fileData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: name, version, fileName, fileData' 
      });
    }

    // Check for duplicate names
    const existingResume = await Resume.findOne({ 
      name: { $regex: new RegExp(`^${resumeData.name}$`, 'i') }, 
      userId: req.user.id 
    });
    
    if (existingResume) {
      return res.status(400).json({ 
        success: false, 
        error: 'A resume with this name already exists' 
      });
    }

    const resume = new Resume(resumeData);
    const savedResume = await resume.save();
    
    res.status(201).json({ success: true, data: savedResume });
  } catch (error) {
    console.error('Error creating resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update resume
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const resume = await Resume.findOneAndUpdate(
      { _id: id, userId: req.user.id }, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    res.json({ success: true, data: resume });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Set default resume
router.patch('/:id/default', async (req, res) => {
  try {
    const { id } = req.params;

    // Remove default from all other resumes
    await Resume.updateMany(
      { userId: req.user.id, _id: { $ne: id } },
      { isDefault: false }
    );

    // Set this resume as default
    const resume = await Resume.findOneAndUpdate(
      { _id: id, userId: req.user.id }, 
      { isDefault: true }, 
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    res.json({ success: true, data: resume });
  } catch (error) {
    console.error('Error setting default resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete resume
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const resume = await Resume.findOneAndDelete({ _id: id, userId: req.user.id });

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    // If deleted resume was default, make the first available resume default
    if (resume.isDefault) {
      const firstResume = await Resume.findOne({ userId: req.user.id }).sort({ uploadDate: -1 });
      if (firstResume) {
        firstResume.isDefault = true;
        await firstResume.save();
      }
    }

    res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get resume by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resume = await Resume.findOne({ _id: id, userId: req.user.id });

    if (!resume) {
      return res.status(404).json({ success: false, error: 'Resume not found' });
    }

    res.json({ success: true, data: resume });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;