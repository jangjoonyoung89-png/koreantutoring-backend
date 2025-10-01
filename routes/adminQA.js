const express = require("express");
const router = express.Router();
const QA = require("../models/QA");
const { verifyToken, requireRole } = require("../middleware/auth");

// 모든 Q&A 목록 불러오기 (관리자 전용)
router.get("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const qas = await QA.find()
      .populate("student", "name email")
      .populate("tutor", "name email")
      .sort({ createdAt: -1 });
    res.json(qas);
  } catch (err) {
    res.status(500).json({ message: "불러오기 실패", error: err.message });
  }
});

// 관리자 답변 수정
router.put("/:id/answer", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { answer } = req.body;
    const qa = await QA.findById(req.params.id);
    if (!qa) return res.status(404).json({ message: "질문을 찾을 수 없음" });

    qa.answer = answer;
    qa.answeredAt = new Date();
    await qa.save();
    res.json(qa);
  } catch (err) {
    res.status(500).json({ message: "답변 수정 실패", error: err.message });
  }
});

// 관리자 Q&A 삭제
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const qa = await QA.findByIdAndDelete(req.params.id);
    if (!qa) return res.status(404).json({ message: "질문을 찾을 수 없음" });
    res.json({ message: "질문 삭제 완료" });
  } catch (err) {
    res.status(500).json({ message: "삭제 실패", error: err.message });
  }
});

module.exports = router;