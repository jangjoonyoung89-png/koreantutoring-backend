require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail"); // 이메일 발송 모듈
const User = require("../models/User"); // User 모델 경로 확인

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/koreantutoring";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB 연결 성공");

    const adminEmail = "jjy@mail.kcu.ac"; // 새 관리자 이메일
    const adminName = "관리자";
    const adminPassword = "Admin@1234"; // 초기 비밀번호 (실제 운영 시 이메일로 재설정 권장)

    // 이미 계정 존재하는지 확인
    let user = await User.findOne({ email: adminEmail });
    if (user) {
      console.log("ℹ 이미 관리자 계정 존재:", user);
    } else {
      // 관리자 계정 생성
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpire = Date.now() + 1000 * 60 * 30; // 30분 유효

      user = new User({
        email: adminEmail,
        full_name: adminName,
        password: hashedPassword,
        role: "admin",
        resetToken,
        resetTokenExpire,
      });

      await user.save();
      console.log("✅ 관리자 계정 생성 완료!", user);

      // 초기 비밀번호 또는 재설정 링크 이메일 발송
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/admin/reset-password?token=${resetToken}`;
      const htmlContent = `
        <h3>${adminName}님,</h3>
        <p>관리자 계정이 생성되었습니다.</p>
        <p>초기 비밀번호: <strong>${adminPassword}</strong></p>
        <p>안전하게 비밀번호를 재설정하시려면 아래 링크를 클릭하세요:</p>
        <a href="${resetLink}">비밀번호 재설정</a>
        <p>위 링크는 30분간 유효합니다.</p>
      `;

      try {
        await sendEmail(adminEmail, "관리자 계정 생성 및 비밀번호 재설정 안내", htmlContent);
        console.log(`✅ 관리자 이메일 발송 완료: ${adminEmail}`);
      } catch (err) {
        console.error("❌ 이메일 발송 실패:", err.message);
      }
    }

    mongoose.disconnect();
    console.log("✅ 완료");
  } catch (err) {
    console.error("❌ 오류 발생:", err);
  }
}

main();