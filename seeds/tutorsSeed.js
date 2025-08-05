const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Tutor = require("../models/Tutor");

dotenv.config();


mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log("✅ MongoDB Atlas 연결 성공");

  const sampleTutors = [
    {
      name: "김영희",
      bio: "친절하게 한국어를 가르치는 튜터입니다.",
      price: 20000,
    },
    {
      name: "이철수",
      bio: "TOPIK 시험 대비 전문 튜터입니다.",
      price: 25000,
    },
  ];

  await Tutor.deleteMany(); 
  await Tutor.insertMany(sampleTutors);
  console.log("✅ 샘플 튜터 데이터 삽입 완료");

  mongoose.disconnect();
});