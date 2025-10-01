const express = require("express");
const router = express.Router();
const QA = require("../models/QA");
const { verifyToken, requireRole } = require("../middleware/auth");

// 학생이 질문 등록
router.post("/", verifyToken, requireRole("student"), async (req, res) => {
  try {
    const { tutorId, question } = req.body;
    const qa = new QA({ student: req.user._id, tutor: tutorId, question });
    await qa.save();
    res.status(201).json(qa);
  } catch (err) {
    res.status(500).json({ message: "질문 등록 실패", error: err.message });
  }
});

// 튜터가 답변 등록
router.put("/:id/answer", verifyToken, requireRole("tutor"), async (req, res) => {
  try {
    const { answer } = req.body;
    const qa = await QA.findById(req.params.id);
    if (!qa) return res.status(404).json({ message: "질문을 찾을 수 없음" });
    if (qa.tutor.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "권한 없음" });

    qa.answer = answer;
    qa.answeredAt = new Date();
    await qa.save();
    res.json(qa);
  } catch (err) {
    res.status(500).json({ message: "답변 등록 실패", error: err.message });
  }
});

// 특정 튜터의 Q&A 목록 불러오기
router.get("/tutor/:tutorId", async (req, res) => {
  try {
    const qas = await QA.find({ tutor: req.params.tutorId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    res.json(qas);
  } catch (err) {
    res.status(500).json({ message: "불러오기 실패", error: err.message });
  }
});

module.exports = router;