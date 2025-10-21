import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

/**
 * ✅ 회원가입 API
 * POST /api/auth/register
 */
export const registerUser = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    // 1️⃣ 이메일 정규화 (공백 제거, 소문자 변환)
    email = email.trim().toLowerCase();

    // 2️⃣ 이메일 중복 검사
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "이미 가입된 이메일입니다." });
    }

    // 3️⃣ 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ 새 사용자 생성
    const newUser = new User({
      name: name?.trim() || "이름 없음",
      email,
      password: hashedPassword,
      role: role || "student",
    });

    await newUser.save();

    // 5️⃣ JWT 발급
    const token = jwt.sign(
      { userId: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6️⃣ 기존 쿠키 초기화 후 새 토큰 설정
    res.clearCookie("token");
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    // 7️⃣ 응답 반환
    res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("회원가입 오류:", err);
    res.status(500).json({ message: "회원가입 중 서버 오류가 발생했습니다." });
  }
};

/**
 * ✅ 비밀번호 재설정 메일 발송 API
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1️⃣ 사용자 찾기
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "등록되지 않은 이메일입니다." });
    }

    // 2️⃣ JWT 토큰 생성 (1시간 유효)
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // 3️⃣ 프론트엔드 비밀번호 재설정 URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // 4️⃣ Nodemailer 설정 (Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 5️⃣ 메일 내용 구성
    const mailOptions = {
      from: `"Korean Tutoring" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "비밀번호 재설정 안내",
      html: `
        <h2>안녕하세요 ${user.name || "회원"}님!</h2>
        <p>아래 링크를 클릭하여 비밀번호를 재설정하세요.</p>
        <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        <p>(이 링크는 1시간 동안만 유효합니다.)</p>
        <br/>
        <p>본인이 요청하지 않은 경우 이 메일을 무시하셔도 됩니다.</p>
      `,
    };

    // 6️⃣ 메일 전송
    const info = await transporter.sendMail(mailOptions);

    // 7️⃣ 콘솔 로그 (디버깅용)
    console.log("✅ 비밀번호 재설정 메일 전송 성공:", info.messageId);
    console.log("📤 발송 대상:", user.email);
    console.log("🔗 재설정 링크:", resetUrl);

    res.json({ message: "비밀번호 재설정 메일이 발송되었습니다." });
  } catch (error) {
    console.error("❌ 메일 발송 오류:", error);
    res.status(500).json({ message: "메일 발송 중 오류가 발생했습니다." });
  }
};

/**
 * ✅ 실제 비밀번호 변경 API
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // 1️⃣ 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(400).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 2️⃣ 새 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3️⃣ DB에 저장
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "비밀번호가 성공적으로 변경되었습니다." });
  } catch (error) {
    console.error("❌ 비밀번호 변경 오류:", error);
    res.status(500).json({ message: "비밀번호 재설정 중 오류가 발생했습니다." });
  }
};