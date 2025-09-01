const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { authenticateToken } = require("../middleware/auth"); // 수정된 부분

// 비밀번호 변경
router.patch("/:id/password", authenticateToken, async (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  if (req.user.id !== userId) {
    return res.status(403).json({ detail: "자신의 비밀번호만 변경할 수 있습니다." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ detail: "현재 비밀번호가 일치하지 않습니다." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 내 프로필 조회
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });
    }
    res.json(user);
  } catch (err) {
    console.error("사용자 조회 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 특정 유저 프로필 조회 (본인만 가능)
router.get("/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  if (req.user.id !== userId) {
    return res.status(403).json({ detail: "자신의 프로필만 조회할 수 있습니다." });
  }

  try {
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 프로필 수정 (본인만 가능)
router.put("/:id", authenticateToken, async (req, res) => {
  const userId = req.params.id;

  if (req.user.id !== userId) {
    return res.status(403).json({ detail: "자신의 프로필만 수정할 수 있습니다." });
  }

  const { full_name, email, role } = req.body;
  if (!full_name || !email || !role) {
    return res.status(400).json({ detail: "모든 필드를 입력하세요." });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });

    user.full_name = full_name;
    user.email = email;
    user.role = role;

    await user.save();

    res.json({
      message: "프로필이 성공적으로 수정되었습니다.",
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;