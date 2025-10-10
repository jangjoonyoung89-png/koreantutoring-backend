const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const nodemailer = require("nodemailer");
const path = require("path");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// -------------------------------
// ⚙️ 환경 변수
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
// 🧩 회원가입 API
// -------------------------------
router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ detail: "모든 필드를 입력해 주세요." });
    }

    // 이메일 중복 확인
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ detail: "이미 가입된 이메일입니다." });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 유저 생성
    const user = new User({
      email,
      password: hashedPassword,
      full_name,
      role,
    });

    await user.save();

    // ✅ 환영 이메일 템플릿 경로
    const templatePath = path.join(__dirname, "../templates/welcome.html");
    let htmlContent = "";

    if (fs.existsSync(templatePath)) {
      htmlContent = fs
        .readFileSync(templatePath, "utf-8")
        .replace("{{full_name}}", user.full_name);
    } else {
      htmlContent = `<h2>${user.full_name}님, 환영합니다!</h2><p>Korean Tutoring 회원가입이 완료되었습니다 🎉</p>`;
    }

    // ✅ 이메일 발송기
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ 이메일 발송
    try {
      await transporter.sendMail({
        to: user.email,
        subject: "환영합니다! Korean Tutoring 회원가입 완료 🎉",
        html: htmlContent,
      });
    } catch (mailErr) {
      console.error("📧 이메일 발송 실패:", mailErr);
    }

    // ✅ 회원가입 성공 응답
    res.status(201).json({
      message: "회원가입 성공",
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
// 🔐 로그인 API (관리자 포함)
// -------------------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // 유저 확인
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ detail: "존재하지 않는 사용자입니다." });
    }

    // 비밀번호 확인
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ detail: "비밀번호가 일치하지 않습니다." });
    }

    // JWT 발급
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });
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

    await sendEmail(user.email, "비밀번호 재설정 링크 안내", htmlContent);

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

    if (!user) {
      return res.status(400).json({ detail: "유효하지 않거나 만료된 토큰입니다." });
    }

    const hashed = await bcrypt.hash(password, 10);

    user.password = hashed;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    console.error("❌ 비밀번호 재설정 오류:", err);
    res.status(500).json({ detail: "서버 오류가 발생했습니다." });
  }
});

module.exports = router;