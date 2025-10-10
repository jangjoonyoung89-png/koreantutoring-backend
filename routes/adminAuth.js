const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // ✅ Admin이 아니라 User로 변경
const bcrypt = require("bcrypt");

// ✅ 환경 변수 사용
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// ----------------------------
// 🔐 관리자 로그인 API
// ----------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 이메일로 사용자 찾기
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ detail: "존재하지 않는 계정입니다." });
    }

    // 관리자 계정인지 확인
    if (user.role !== "admin") {
      return res.status(403).json({ detail: "관리자 계정이 아닙니다." });
    }

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ detail: "비밀번호가 틀렸습니다." });
    }

    // JWT 발급
    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ 로그인 성공 응답
    res.json({
      message: "관리자 로그인 성공",
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ 관리자 로그인 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;