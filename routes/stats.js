const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const Review = require("../models/Review");
const Tutor = require("../models/Tutor");

router.get("/admin", async (req, res) => {
  try {
    const students = await User.countDocuments({ role: "student" });
    const tutors = await User.countDocuments({ role: "tutor" });
    const bookings = await Booking.countDocuments();
    const totalPayments = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const reviews = await Review.countDocuments();

    const topTutors = await Tutor.find()
      .sort({ averageRating: -1 })
      .limit(5)
      .select("full_name averageRating");

    res.json({
      totalStudents: students,
      totalTutors: tutors,
      totalBookings: bookings,
      totalPayments: totalPayments[0]?.total || 0,
      totalReviews: reviews,
      topTutors,
    });
  } catch (err) {
    console.error("통계 조회 오류", err);
    res.status(500).json({ error: "통계 조회 중 오류 발생" });
  }
});

module.exports = router;