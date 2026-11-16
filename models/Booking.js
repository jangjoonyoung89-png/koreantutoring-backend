const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: String,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    notes: {
      type: String,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "canceled"],
      default: "pending",
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

const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

module.exports = Booking;