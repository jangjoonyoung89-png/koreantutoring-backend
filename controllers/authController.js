import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * 회원가입 API
 * POST /api/auth/register
 */
export const registerUser = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    // 1️⃣ 이메일 정규화 (공백/대소문자 처리)
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