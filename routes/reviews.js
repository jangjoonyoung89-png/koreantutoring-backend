const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const requireAuth = require("../middleware/requireAuth");
const reviewController = require("../controllers/reviewController");
const auth = require("../middleware/auth");


router.get("/student/:studentId", auth, reviewController.getReviewsByStudent);

router.post("/", async (req, res) => {
  const { tutorId, studentId, rating, comment } = req.body;
  if (!tutorId || !studentId || !rating || !comment) {
    return res.status(400).json({ detail: "모든 필드를 입력해주세요." });
  }

  try {
    const review = new Review({ tutor: tutorId, student: studentId, rating, comment });
    await review.save();
    res.status(201).json({ review });
  } catch (err) {
    console.error("리뷰 생성 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 리뷰 수정
router.put("/:id", async (req, res) => {
  const { rating, comment } = req.body;
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { rating, comment },
      { new: true }
    );
    if (!review) return res.status(404).json({ detail: "리뷰 없음" });
    res.json({ review });
  } catch (err) {
    console.error("리뷰 수정 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 리뷰 삭제
router.delete("/:id", async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ detail: "리뷰를 찾을 수 없습니다." });
    }
    res.json({ message: "리뷰가 삭제되었습니다." });
  } catch (err) {
    console.error("리뷰 삭제 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 특정 튜터 리뷰 목록 조회
router.get("/tutor/:tutorId", async (req, res) => {
  try {
    const reviews = await Review.find({ tutor: req.params.tutorId })
      .populate("student", "full_name");
    res.json(reviews);
  } catch (err) {
    console.error("튜터 리뷰 조회 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 특정 튜터 평균 평점 조회
router.get("/tutor/:tutorId/average", async (req, res) => {
  const { tutorId } = req.params;

  try {
    const reviews = await Review.find({ tutor: tutorId });

    if (reviews.length === 0) {
      return res.json({ average: 0, count: 0 });
    }

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const average = total / reviews.length;

    res.json({ average: average.toFixed(1), count: reviews.length });
  } catch (err) {
    console.error("평균 평점 계산 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;