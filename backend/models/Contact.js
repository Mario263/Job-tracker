const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  linkedinUrl: {
    type: String,
    trim: true
  },
  relationship: {
    type: String,
    enum: [
      'Potential Referral',
      'Recruiter',
      'Hiring Manager',
      'Employee',
      'Network Contact',
      'Alumni',
      'Industry Contact'
    ],
    default: 'Network Contact'
  },
  contactStatus: {
    type: String,
    enum: [
      'Not Contacted',
      'Reached Out',
      'Responded',
      'Meeting Scheduled',
      'Referred',
      'Cold Contact'
    ],
    default: 'Not Contacted'
  },
  lastContactDate: {
    type: Date
  },
  nextFollowUpDate: {
    type: Date
  },
  tags: {
    type: String,
    trim: true
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

module.exports = mongoose.model('Contact', contactSchema);