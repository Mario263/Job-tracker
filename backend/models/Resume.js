const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
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
  version: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileData: {
    type: String,
    required: true // Base64 encoded file data
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    default: 'default' // For single-user system
  }
}, {
  timestamps: true
});

// Ensure only one default resume per user
resumeSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model('Resume', resumeSchema);