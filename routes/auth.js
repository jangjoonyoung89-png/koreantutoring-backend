const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const nodemailer = require("nodemailer");

const JWT_SECRET = process.env.JWT_SECRET;


function generateToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}


router.post("/signup", async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    if (!email || !password || !full_name || !role)
      return res.status(400).json({ detail: "모든 필드를 입력해 주세요." });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ detail: "이미 가입된 이메일입니다." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, full_name, role });
    await user.save();

    const html = fs.readFileSync("templates/welcome.html", "utf-8")
      .replace("{{full_name}}", user.full_name);

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: user.email,
      subject: "환영합니다! Korean Tutoring 회원가입 완료",
      html,
    });
    
    res.status(201).json({ message: "회원가입 성공" });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ detail: "존재하지 않는 사용자입니다." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ detail: "비밀번호가 일치하지 않습니다." });

    const token = generateToken(user);

    res.json({
      message: "로그인 성공",
      token,
      user: { email: user.email, full_name: user.full_name, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});


router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });

    const token = crypto.randomBytes(32).toString("hex");
    const expire = Date.now() + 1000 * 60 * 30;

    user.resetToken = token;
    user.resetTokenExpire = expire;
    await user.save();

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;
    const htmlTemplate = fs.readFileSync("templates/reset-password.html", "utf-8")
      .replace("{{full_name}}", user.full_name || user.email)
      .replace("{{resetLink}}", resetLink);

    await sendEmail(user.email, "비밀번호 재설정 링크 안내", htmlTemplate);

    res.json({ message: "비밀번호 재설정 링크가 이메일로 전송되었습니다." });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});


router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ detail: "유효하지 않거나 만료된 토큰입니다." });

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;

    await user.save();

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류가 발생했습니다." });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "해당 이메일을 찾을 수 없습니다." });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });

  const resetLink = `http://localhost:3000/reset-password/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "비밀번호 재설정 링크",
    html: `<p>아래 링크를 클릭해 비밀번호를 재설정하세요.</p><a href="${resetLink}">${resetLink}</a>`,
  });

  res.json({ message: "비밀번호 재설정 링크가 이메일로 전송되었습니다." });
});

module.exports = router;