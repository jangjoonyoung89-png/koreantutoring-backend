const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  filePath: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', postSchema);