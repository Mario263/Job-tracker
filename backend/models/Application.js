const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  jobPortal: {
    type: String,
    default: 'Other'
  },
  jobUrl: {
    type: String,
    trim: true
  },
  applicationDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: [
      'Applied', 
      'Under Review', 
      'Phone Screen', 
      'Technical Assessment',
      'Interview Scheduled', 
      'Final Interview', 
      'Offer', 
      'Rejected', 
      'Withdrawn',
      'On Hold'
    ],
    default: 'Applied'
  },
  resumeVersion: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    trim: true
  },
  salaryRange: {
    type: String,
    trim: true
  },
  jobType: {
    type: String,
    enum: ['', 'Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid', 'On-site'],
    default: ''
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  followUpDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  dateAdded: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);