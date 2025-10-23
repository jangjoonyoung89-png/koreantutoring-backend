require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/koreantutoring";

async function resetTutorPassword() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB 연결 성공");

    const email = "kimmersion@hanmail.net"; // 비밀번호 재설정할 튜터 이메일
    const newPassword = "Tutor@123"; // 새 비밀번호 (원하는 대로 수정 가능)

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ 해당 이메일 사용자 없음");
      return;
    }

    // 비밀번호 재설정
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpire = undefined;
    await user.save();

    console.log(`✅ ${email} 튜터 비밀번호 재설정 완료! 새 비밀번호: ${newPassword}`);

    mongoose.disconnect();
    console.log("✅ 완료");
  } catch (err) {
    console.error("❌ 오류 발생:", err);
    mongoose.disconnect();
  }
}

resetTutorPassword();