const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema(
  {
    // ------------------------
    // 기본 정보
    // ------------------------
    name: { type: String, required: true },   // 튜터 이름
    bio: { type: String },                    // 자기소개
    email: { type: String },                  // 이메일
    photo: { type: String },                  // 프로필 사진 URL
    price: { type: Number },                  // 시간당 요금

    // ------------------------
    // 수업 가능 시간
    // ------------------------
    availableTimes: [
      {
        day: { type: String },                // 예: "Monday"
        slots: [{ type: String }],            // 예: ["10:00", "14:00"]
      },
    ],

    // ------------------------
    // 승인 및 멀티미디어
    // ------------------------
    approved: { type: Boolean, default: false },    // 관리자 승인 여부
    sampleVideoUrl: { type: String, default: "" },  // 샘플 동영상 URL

    // ------------------------
    // 평점 / 리뷰
    // ------------------------
    averageRating: { type: Number, default: 0 },    // 평균 평점
    reviewCount: { type: Number, default: 0 },      // 리뷰 개수

    // ------------------------
    // 관계 (User와 연결)
    // ------------------------
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

module.exports = mongoose.model("Tutor", tutorSchema);