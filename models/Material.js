const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema({
  title: String,
  filePath: String,
  bookingId: String,    
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Material", MaterialSchema);