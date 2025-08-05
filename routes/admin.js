const express = require("express");
const router = express.Router();
const requireAdmin = require("../middleware/requireAdmin");
const Tutor = require("../models/Tutor"); // 튜터 모델


router.get("/tutors", requireAdmin, async (req, res) => {
  try {
    
    const tutors = await Tutor.find({ approved: false });
    res.json(tutors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "튜터 목록 조회 실패" });
  }
});


router.patch("/tutors/:id/approve", requireAdmin, async (req, res) => {
  try {
    const tutor = await Tutor.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    if (!tutor) {
      return res.status(404).json({ message: "튜터를 찾을 수 없습니다." });
    }
    res.json({ message: "튜터 승인 완료", tutor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "튜터 승인 실패" });
  }
});


router.patch("/tutors/:id/reject", requireAdmin, async (req, res) => {
  try {
    
    
    const tutor = await Tutor.findByIdAndUpdate(
      req.params.id,
      { approved: false, rejected: true },
      { new: true }
    );
    if (!tutor) {
      return res.status(404).json({ message: "튜터를 찾을 수 없습니다." });
    }
    res.json({ message: "튜터 거절 완료", tutor });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "튜터 거절 실패" });
  }
});

module.exports = router;