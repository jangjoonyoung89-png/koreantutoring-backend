const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const User = require("../models/User");

console.log("authenticateToken is function?", typeof authenticateToken === "function");
console.log("requireAdmin is function?", typeof requireAdmin === "function");

// 튜터 인증 요청 (튜터가 본인 인증을 요청할 때)
router.post("/request", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });
    if (user.role !== "tutor") return res.status(403).json({ detail: "튜터만 인증 요청할 수 있습니다." });

    user.tutorVerified = false; // 인증 요청 상태(관리자 승인 전)
    await user.save();

    res.json({ message: "튜터 인증 요청이 접수되었습니다." });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 관리자: 튜터 인증 승인
router.patch("/approve/:userId", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });
    if (user.role !== "tutor") return res.status(400).json({ detail: "튜터가 아닙니다." });

    user.tutorVerified = true;
    await user.save();

    res.json({ message: "튜터 인증이 승인되었습니다." });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;