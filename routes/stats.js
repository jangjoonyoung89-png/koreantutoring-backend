const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const Tutor = require("../models/Tutor");
const requireAdmin = require("../middleware/requireAdmin"); // 관리자 인증 미들웨어

router.get("/admin", requireAdmin, async (req, res) => {
  try {
    // 학생 수 조회
    const students = await User.countDocuments({ role: "student" });

    // 튜터 수 조회
    const tutors = await User.countDocuments({ role: "tutor" });

    // 예약 수 조회
    const bookings = await Booking.countDocuments();

    // 결제 총액 조회 (결제 상태가 성공인 경우만 집계 가능)
    const totalPaymentsAgg = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalPayments = totalPaymentsAgg.length > 0 ? totalPaymentsAgg[0].total : 0;

    // 리뷰 수 조회
    const reviews = await Review.countDocuments();

    // 평점 상위 5명 튜터 조회
    const topTutors = await Tutor.find()
      .sort({ averageRating: -1 })  // averageRating 필드 기준 내림차순 정렬
      .limit(5)
      .select("name averageRating");

    // 응답
    res.json({
      totalStudents: students,
      totalTutors: tutors,
      totalBookings: bookings,
      totalPayments,
      totalReviews: reviews,
      topTutors,
    });
  } catch (err) {
    console.error("통계 조회 오류", err);
    res.status(500).json({ error: "통계 조회 중 오류 발생" });
  }
});

module.exports = router;