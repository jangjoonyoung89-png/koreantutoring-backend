const Review = require("../models/Review");
const Tutor = require("../models/Tutor");

exports.createReview = async (req, res) => {
  try {
    const { tutor, student, rating, comment } = req.body;

    const newReview = await Review.create({
      tutor,
      student,
      rating,
      comment,
    });

    
    const reviews = await Review.find({ tutor });
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avg = total / reviews.length;

    
    await Tutor.findByIdAndUpdate(tutor, { averageRating: avg });

    res.status(201).json(newReview);
  } catch (error) {
    console.error("리뷰 생성 실패", error);
    res.status(500).json({ error: "리뷰 생성 중 오류 발생" });
  }
};

exports.getReviewsByStudent = async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const reviews = await Review.find({ student: studentId }).populate("tutor", "name");

    res.json(reviews);
  } catch (error) {
    console.error("리뷰 조회 실패", error);
    res.status(500).json({ error: "리뷰 조회 중 오류 발생" });
  }
};