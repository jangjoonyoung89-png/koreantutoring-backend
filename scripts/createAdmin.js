const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin"); // Admin 모델 경로 확인
require("dotenv").config();

(async () => {
  try {
    // ======================
    // 🔗 MongoDB 연결
    // ======================
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB 연결 성공");

    // ======================
    // 🔑 관리자 계정 정보
    // ======================
    const email = "admin@example.com"; // 관리자 이메일
    const password = "admin123";       // 초기 비밀번호
    const hashed = await bcrypt.hash(password, 10);

    // ======================
    // ⚠️ 중복 방지: 이미 계정이 있으면 종료
    // ======================
    const existing = await Admin.findOne({ email });
    if (existing) {
      console.log("⚠️ 관리자 계정이 이미 존재합니다.");
      process.exit(0);
    }

    // ======================
    // ✅ 관리자 계정 생성
    // ======================
    await Admin.create({ email, password: hashed });
    console.log("✅ 관리자 계정 생성 완료");
    console.log(`📧 이메일: ${email}`);
    console.log(`🔑 비밀번호: ${password}`);

    process.exit(0);
  } catch (err) {
    console.error("❌ 관리자 계정 생성 실패:", err);
    process.exit(1);
  }
})();