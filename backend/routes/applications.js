const express = require('express');
const router = express.Router();
const Application = require('../models/Application');

// GET all applications for the authenticated user
router.get('/', async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id }).sort({ dateAdded: -1 });
    res.json(applications);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});
// POST new application for the authenticated user
router.post('/', async (req, res) => {
  try {
    // 🚫 Remove _id and id if frontend accidentally sends them
    if ('_id' in req.body) {
      delete req.body._id;
    }
    if ('id' in req.body) {
      delete req.body.id;
    }

    // Add userId to the application
    const applicationData = { ...req.body, userId: req.user.id };
    const application = new Application(applicationData);
    const savedApplication = await application.save();
    res.status(201).json(savedApplication);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(400).json({ error: 'Failed to create application', details: error.message });
  }
});
// // POST new application
// router.post('/', async (req, res) => {
//   try {
//     const application = new Application(req.body);
//     const savedApplication = await application.save();
//     res.status(201).json(savedApplication);
//   } catch (error) {
//     console.error('Error creating application:', error);
//     res.status(400).json({ error: 'Failed to create application', details: error.message });
//   }
// });

// PUT update application for the authenticated user
router.put('/:id', async (req, res) => {
  try {
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json(application);
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(400).json({ error: 'Failed to update application' });
  }
});

// DELETE application for the authenticated user
router.delete('/:id', async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to delete application' });
  }
});

// GET application statistics for the authenticated user
router.get('/stats', async (req, res) => {
  try {
    const total = await Application.countDocuments({ userId: req.user.id });
    const statusCounts = await Application.aggregate([
      { $match: { userId: req.user.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const stats = {
      total,
      statusBreakdown: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;