const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin");

(async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/your-db-name"); // DB 주소
    const hashed = await bcrypt.hash("admin123", 10);
    await Admin.create({ email: "admin@example.com", password: hashed });
    console.log("✅ 관리자 계정 생성 완료");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();