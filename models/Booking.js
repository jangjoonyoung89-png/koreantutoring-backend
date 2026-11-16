const mongoose = require("mongoose");

// ==========================================
// ROKMUN 수업 예약 모델
// ==========================================

const bookingSchema = new mongoose.Schema(
  {
    // 예약된 튜터
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: true,
    },

    // 예약한 학습자
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 수업 날짜
    date: {
      type: String,
      required: true,
    },

    // 수업 시작 시간
    time: {
      type: String,
      required: true,
    },

    // 예약 관련 메모
    notes: {
      type: String,
    },

    // ======================================
    // 예약 상태
    // ======================================
    // pending   : 예약 대기
    // confirmed : 예약 확정
    // canceled  : 예약 취소 또는 거절
    // completed : 수업 완료

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "canceled",
        "completed",
      ],
      default: "pending",
    },

    // ======================================
    // 실제 수업 완료 처리 일시
    // ======================================
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// 동시 중복 예약 방지
// ==========================================
// 같은 튜터 + 같은 날짜 + 같은 시간에는
// 예약 대기 또는 예약 확정 상태의 예약을
// 한 건만 허용합니다.
//
// 취소된 예약은 제외하므로
// 취소 또는 거절 후 다시 예약할 수 있습니다.
//
// 기존 MongoDB Atlas 인덱스를 유지합니다.

bookingSchema.index(
  {
    tutor: 1,
    date: 1,
    time: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      status: {
        $in: ["pending", "confirmed"],
      },
    },
    name: "unique_active_tutor_booking",
  }
);

// ==========================================
// 모델 생성 및 내보내기
// ==========================================

const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

module.exports = Booking;