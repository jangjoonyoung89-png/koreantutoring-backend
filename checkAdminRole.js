require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User"); // User 모델 경로 확인

const MONGODB_URI = "mongodb+srv://kimmersion:<db_password>@cluster0.cckt5sx.mongodb.net/koreantutoring?retryWrites=true&w=majority";

async function main() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("✅ MongoDB 연결 성공");

    const adminEmail = "관리자이메일@도메인"; // 확인/수정할 관리자 이메일

    // 1️⃣ 현재 role 확인
    const user = await User.findOne({ email: adminEmail }, { email: 1, full_name: 1, role: 1 });
    if (!user) {
      console.log("❌ 해당 이메일 사용자 없음");
      return;
    }
    console.log("현재 사용자 정보:", user);

    // 2️⃣ role이 admin이 아니면 변경
    if (user.role !== "admin") {
      await User.updateOne({ email: adminEmail }, { $set: { role: "admin" } });
      console.log(`✅ role을 admin으로 변경했습니다.`);
    } else {
      console.log("ℹ 이미 admin 계정입니다.");
    }

    mongoose.disconnect();
  } catch (err) {
    console.error("❌ 오류 발생:", err);
  }
}

main();