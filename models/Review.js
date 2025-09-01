const mongoose = require("mongoose");

// ======================
// 리뷰 스키마 정의
// ======================
const reviewSchema = new mongoose.Schema(
  {
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

// ======================
// 리뷰 저장 후 평균 평점 자동 계산
// ======================
reviewSchema.post("save", async function () {
  try {
    const Tutor = require("./Tutor");
    const reviews = await this.constructor.find({ tutor: this.tutor });

    const avg =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    await Tutor.findByIdAndUpdate(this.tutor, {
      averageRating: Number(avg.toFixed(1)),
      reviewCount: reviews.length,
    });
  } catch (err) {
    console.error("리뷰 저장 후 평균 평점 계산 오류:", err);
  }
});

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);