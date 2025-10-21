const mongoose = require("mongoose");

const lessonSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  topic: String,
  startTime: Date,
  duration: Number,
  joinUrl: String,  // 학생 입장 링크
  startUrl: String, // 튜터 시작 링크
});

module.exports = mongoose.model("Lesson", lessonSchema);