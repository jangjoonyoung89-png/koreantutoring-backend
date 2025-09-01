const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // 튜터 이름
    bio: { type: String },                  // 자기소개

    availableTimes: [
      {
        day: { type: String },              // 예: "Monday"
        slots: [{ type: String }],          // 예: ["10:00", "14:00"]
      },
    ],

    price: Number,                           // 시간당 요금
    photo: String,                           // 프로필 사진 URL
    email: String,                           // 이메일

    approved: { type: Boolean, default: false }, // 관리자 승인 여부
    sampleVideoUrl: { type: String, default: "" }, // 샘플 동영상 URL

    averageRating: {                         // 평균 평점
      type: Number,
      default: 0,
    },

    reviewCount: {                           // 리뷰 개수
      type: Number,
      default: 0,
    },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Tutor", tutorSchema);