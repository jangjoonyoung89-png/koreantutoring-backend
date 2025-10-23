const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

// -------------------------------
// ⚙️ 환경 변수 설정
// -------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// -------------------------------
// 🔧 JWT 토큰 생성 함수
// -------------------------------
function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// -------------------------------
// 🧩 회원가입
// -------------------------------
router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name || !role)
      return res.status(400).json({ detail: "모든 필드를 입력해 주세요." });

    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser)
      return res.status(409).json({ detail: "이미 가입된 이메일입니다." });

    const user = new User({
      email: normalizedEmail,
      password,
      full_name,
      role,
    });

    await user.save();

    // 📧 환영 이메일 (선택)
    const templatePath = path.join(__dirname, "../templates/welcome.html");
    let htmlContent = "";

    if (fs.existsSync(templatePath)) {
      htmlContent = fs
        .readFileSync(templatePath, "utf-8")
        .replace("{{full_name}}", user.full_name);
    } else {
      htmlContent = `<h2>${user.full_name}님, 환영합니다!</h2>
      <p>Korean Tutoring 회원가입이 완료되었습니다 🎉</p>`;
    }

    try {
      await sendEmail(
        user.email,
        "환영합니다! Korean Tutoring 회원가입 완료 🎉",
        htmlContent
      );
    } catch (emailErr) {
      console.error("📧 이메일 발송 실패:", emailErr.message);
    }

    const token = generateToken(user);

    res.status(201).json({
      message: "회원가입 성공",
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ 회원가입 오류:", err);
    res.status(500).json({ detail: "서버 오류가 발생했습니다." });
  }
});

// -------------------------------
// 🔐 로그인
// -------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ detail: "이메일과 비밀번호를 입력해 주세요." });

    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user)
      return res.status(400).json({ detail: "존재하지 않는 사용자입니다." });

    const isMatch = await user.comparePassword(password);

    if (!isMatch)
      return res.status(400).json({ detail: "비밀번호가 일치하지 않습니다." });

    const token = generateToken(user);

    res.json({
      message: "로그인 성공",
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ 로그인 오류:", err);
    res.status(500).json({ detail: "서버 오류가 발생했습니다." });
  }
});

// -------------------------------
// ✉️ 비밀번호 재설정 요청
// -------------------------------
router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    // 보안상 존재 여부는 숨김
    if (!user) {
      return res.json({
        message: "비밀번호 재설정 링크가 이메일로 전송되었습니다.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expire = Date.now() + 1000 * 60 * 30; // 30분

    user.resetToken = token;
    user.resetTokenExpire = expire;
    await user.save();

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;

    const templatePath = path.join(__dirname, "../templates/reset-password.html");
    let htmlContent = "";

    if (fs.existsSync(templatePath)) {
      htmlContent = fs
        .readFileSync(templatePath, "utf-8")
        .replace("{{full_name}}", user.full_name || user.email)
        .replace("{{resetLink}}", resetLink);
    } else {
      htmlContent = `<h3>${user.full_name || user.email}님,</h3>
      <p>비밀번호를 재설정하려면 아래 링크를 클릭하세요.</p>
      <a href="${resetLink}">비밀번호 재설정</a>`;
    }

    await sendEmail(
      user.email,
      "Korean Tutoring 비밀번호 재설정 안내",
      htmlContent
    );

    res.json({ message: "비밀번호 재설정 링크가 이메일로 전송되었습니다." });
  } catch (err) {
    console.error("❌ 비밀번호 재설정 요청 오류:", err);
    res.status(500).json({ detail: "서버 오류가 발생했습니다." });
  }
});

// -------------------------------
// 🔄 비밀번호 재설정 완료
// -------------------------------
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ detail: "유효하지 않거나 만료된 토큰입니다." });

    // 새 비밀번호 설정
    user.password = password; // ✅ pre("save")에서 자동으로 해시됨
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

    await user.save();

    console.log(`✅ ${user.email} 비밀번호가 성공적으로 변경됨`);

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    console.error("❌ 비밀번호 재설정 오류:", err);
    res.status(500).json({ detail: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;