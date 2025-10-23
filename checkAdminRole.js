require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User"); // User 모델 경로 확인

// ✅ 환경 변수 또는 바로 MongoDB URI 입력
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://<username>:<password>@cluster0.cckt5sx.mongodb.net/koreantutoring?retryWrites=true&w=majority";

// ✅ 관리자 이메일 설정
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "kimmersion@hanmail.net";

async function main() {
  try {
    // MongoDB 연결
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ MongoDB 연결 성공");

    // 1️⃣ 현재 role 확인
    const user = await User.findOne({ email: ADMIN_EMAIL }, { email: 1, full_name: 1, role: 1 });
    if (!user) {
      console.log("❌ 해당 이메일 사용자 없음. 새 관리자 계정을 생성합니다.");

      // 관리자 계정 없으면 생성
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("admin123", 10); // 초기 비밀번호 설정
      const newAdmin = new User({
        email: ADMIN_EMAIL,
        full_name: "관리자",
        password: hashedPassword,
        role: "admin",
      });
      await newAdmin.save();
      console.log("✅ 관리자 계정 생성 완료:", ADMIN_EMAIL);
    } else {
      console.log("현재 사용자 정보:", user);

      // 2️⃣ role이 admin이 아니면 변경
      if (user.role !== "admin") {
        await User.updateOne({ email: ADMIN_EMAIL }, { $set: { role: "admin" } });
        console.log("✅ role을 admin으로 변경했습니다.");
      } else {
        console.log("ℹ 이미 admin 계정입니다.");
      }
    }

    mongoose.disconnect();
    console.log("✅ 완료");
  } catch (err) {
    console.error("❌ 오류 발생:", err);
  }
}

main();