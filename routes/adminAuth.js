const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ✅ 관리자 이메일 고정
const ADMIN_EMAIL = "kimmersion@hanmail.net";

// -------------------------------
// 🔐 관리자 로그인
// -------------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 이메일이 고정된 관리자 이메일과 일치하는지 체크
    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ detail: "관리자 계정이 아닙니다." });
    }

    const user = await User.findOne({ email: ADMIN_EMAIL, role: "admin" });
    if (!user) {
      return res.status(401).json({ detail: "존재하지 않는 계정입니다." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ detail: "비밀번호가 틀렸습니다." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

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

// -------------------------------
// ✉️ 관리자 비밀번호 재설정 요청
// -------------------------------
router.post("/request-reset", async (req, res) => {
  try {
    // 이메일이 고정된 관리자 이메일과 일치해야 요청 가능
    if (req.body.email !== ADMIN_EMAIL) {
      return res.status(403).json({ detail: "관리자 계정이 아닙니다." });
    }

    const user = await User.findOne({ email: ADMIN_EMAIL, role: "admin" });
    if (!user) {
      return res.status(403).json({ detail: "인증 정보가 없습니다." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expire = Date.now() + 1000 * 60 * 30; // 30분 유효

    user.resetToken = token;
    user.resetTokenExpire = expire;
    await user.save();

    const resetLink = `${FRONTEND_URL}/admin/reset-password?token=${token}`;

    const templatePath = path.join(__dirname, "../templates/reset-password.html");
    let htmlContent = "";
    if (fs.existsSync(templatePath)) {
      htmlContent = fs
        .readFileSync(templatePath, "utf-8")
        .replace("{{full_name}}", user.full_name || user.email)
        .replace("{{resetLink}}", resetLink);
    } else {
      htmlContent = `<h3>${user.full_name || user.email}님,</h3>
<p>관리자 비밀번호를 재설정하려면 아래 링크를 클릭하세요.</p>
<a href="${resetLink}">비밀번호 재설정</a>`;
    }

    await sendEmail(user.email, "관리자 비밀번호 재설정 안내", htmlContent);

    res.json({ message: "관리자 비밀번호 재설정 링크가 이메일로 전송되었습니다." });
  } catch (err) {
    console.error("❌ 관리자 비밀번호 재설정 요청 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// -------------------------------
// 🔄 관리자 비밀번호 재설정 완료
// -------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
      email: ADMIN_EMAIL,
      role: "admin",
    });

    if (!user) {
      return res.status(400).json({ detail: "유효하지 않거나 만료된 토큰입니다." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    res.json({ message: "관리자 비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    console.error("❌ 관리자 비밀번호 재설정 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;