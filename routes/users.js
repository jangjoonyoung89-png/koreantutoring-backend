const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const bcrypt = require("bcrypt");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "인증이 필요합니다." });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ detail: "토큰이 유효하지 않습니다." });
  }
}

router.patch("/:id/password", requireAuth, async (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  if (req.user.id !== userId) {
    return res.status(403).json({ detail: "자신의 비밀번호만 변경할 수 있습니다." });
  }

  try {
    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ detail: "현재 비밀번호가 일치하지 않습니다." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "인증이 필요합니다." });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ detail: "토큰이 유효하지 않습니다." });
    req.user = user; 
    next();
  });
}


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
    res.status(500).json({ detail: "서버 오류" });
  }
});


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

    res.json({ message: "프로필이 성공적으로 수정되었습니다.", user: {
      id: user._id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    }});
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // 비밀번호 제외
    if (!user) {
      return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });
    }
    res.json(user);
  } catch (err) {
    console.error("사용자 조회 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;