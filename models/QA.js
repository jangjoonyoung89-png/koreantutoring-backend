const mongoose = require("mongoose");

const qaSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  question: { type: String, required: true },
  answer: { type: String },
  createdAt: { type: Date, default: Date.now },
  answeredAt: { type: Date },
});

module.exports = mongoose.model("QA", qaSchema);