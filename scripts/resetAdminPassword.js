const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User"); // 경로 주의 (backend 폴더 기준)

const MONGO_URI = "mongodb+srv://kimmersion:jang6815@cluster0.cckt5sx.mongodb.net/korean-tutoring";

(async () => {
  await mongoose.connect(MONGO_URI);
  const newPassword = "admin1234";
  const hashed = await bcrypt.hash(newPassword, 10);

  const updated = await User.findOneAndUpdate(
    { email: "jjy@mail.kcu.ac" },
    { password: hashed },
    { new: true }
  );

  if (updated) {
    console.log("✅ 관리자 비밀번호 초기화 완료");
    console.log("이메일:", updated.email);
    console.log("새 비밀번호:", newPassword);
  } else {
    console.log("❌ 관리자 계정을 찾을 수 없습니다.");
  }

  mongoose.connection.close();
})();