const Review = require("../models/Review");
const Tutor = require("../models/Tutor");
const Booking = require("../models/Booking");

exports.createReview = async (req, res) => {
  try {
    const { tutor, rating, comment } = req.body;
    const student = req.user.id; // 인증된 사용자 ID 사용

    // 1. 해당 튜터와 완료된 예약이 있는지 확인
    const completedBooking = await Booking.findOne({
      student,
      tutor,
      status: 'completed',
    });

    if (!completedBooking) {
      return res.status(403).json({ error: "해당 튜터와 수업을 완료한 학생만 리뷰 작성이 가능합니다." });
    }

    // 2. 동일한 튜터에 중복 리뷰 방지 (원한다면)
    const existingReview = await Review.findOne({ tutor, student });
    if (existingReview) {
      return res.status(400).json({ error: "이미 작성된 리뷰가 존재합니다." });
    }

    // 3. 리뷰 생성
    const newReview = await Review.create({
      tutor,
      student,
      rating,
      comment,
    });

    // 4. 튜터 평균 평점 및 리뷰 수 갱신
    const reviews = await Review.find({ tutor });
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = total / reviews.length;

    await Tutor.findByIdAndUpdate(tutor, {
      averageRating: avg,
      reviewCount: reviews.length,
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error("리뷰 생성 실패", error);
    res.status(500).json({ error: "리뷰 생성 중 오류 발생" });
  }
};

exports.getReviewsByStudent = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const reviews = await Review.find({ student: studentId })
      .populate("tutor", "full_name");

    res.json(reviews);
  } catch (error) {
    console.error("리뷰 조회 실패", error);
    res.status(500).json({ error: "리뷰 조회 중 오류 발생" });
  }
};