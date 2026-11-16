const mongoose = require("mongoose");

// ======================
// 리뷰 스키마 정의
// ======================
const reviewSchema = new mongoose.Schema(
  {
    // 리뷰 대상 튜터
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tutor",
      required: true,
    },

    // 리뷰 작성 학습자
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 리뷰가 작성된 수업 예약
    // 기존 리뷰 데이터와의 호환성을 위해
    // 스키마에서는 필수 항목으로 지정하지 않음
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    // 수업 만족도 평점
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "평점은 1부터 5까지의 정수여야 합니다.",
      },
    },

    // 리뷰 내용
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ======================
// 동일 수업 중복 리뷰 방지
// ======================
// booking이 실제 ObjectId인 리뷰에만 적용
// 기존 리뷰 데이터는 그대로 유지
reviewSchema.index(
  {
    booking: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      booking: {
        $type: "objectId",
      },
    },
    name: "unique_review_per_booking",
  }
);

// ======================
// 리뷰 저장 후 평균 평점 자동 계산
// ======================
reviewSchema.post("save", async function () {
  try {
    const Tutor = require("./Tutor");

    const reviews = await this.constructor.find({
      tutor: this.tutor,
    });

    const avg =
      reviews.length > 0
        ? reviews.reduce(
            (sum, r) => sum + r.rating,
            0
          ) / reviews.length
        : 0;

    await Tutor.findByIdAndUpdate(this.tutor, {
      averageRating: Number(avg.toFixed(1)),
      reviewCount: reviews.length,
    });
  } catch (err) {
    console.error(
      "리뷰 저장 후 평균 평점 계산 오류:",
      err
    );
  }
});

// ======================
// 리뷰 모델 내보내기
// ======================
module.exports =
  mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);