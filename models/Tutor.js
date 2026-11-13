const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema(
  {
    // ===================================================
    // 👩‍🏫 기본 정보
    // ===================================================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    bio: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    photo: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      min: 0,
    },

    // ===================================================
    // 📅 수업 가능 시간
    // ===================================================
    availableTimes: [
      {
        day: {
          type: String,
        },

        slots: [
          {
            type: String,
          },
        ],
      },
    ],

    // ===================================================
    // ✅ 관리자 승인 및 거절 상태
    // ===================================================
    approved: {
      type: Boolean,
      default: false,
    },

    rejected: {
      type: Boolean,
      default: false,
    },

    // ===================================================
    // 🎬 샘플 동영상
    // ===================================================
    sampleVideoUrl: {
      type: String,
      default: "",
    },

    // ===================================================
    // ⭐ 평점 및 리뷰
    // ===================================================
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ===================================================
    // 🔗 User 회원 계정 연결
    // ===================================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// ===================================================
// 🛡️ 회원 계정별 튜터 프로필 중복 생성 방지
// userId가 없는 기존 가상 튜터는 유지
// ===================================================
tutorSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $type: "objectId" },
    },
  }
);

// ===================================================
// 🚀 모델 내보내기
// ===================================================
module.exports =
  mongoose.models.Tutor ||
  mongoose.model("Tutor", tutorSchema);