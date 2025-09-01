const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const { authenticateToken } = require("../middleware/auth"); // 인증 미들웨어

// ======================
// 학생 본인 리뷰 목록 조회
// ======================
router.get("/student/:studentId", authenticateToken, async (req, res) => {
  try {
    // 인증된 사용자만 자신의 리뷰 조회 가능
    if (req.user.id !== req.params.studentId) {
      return res.status(403).json({ detail: "권한이 없습니다." });
    }

    const reviews = await Review.find({ student: req.params.studentId })
      .populate("tutor", "name email");
    res.json(reviews);
  } catch (err) {
    console.error("학생 리뷰 조회 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// ======================
// 리뷰 작성 (로그인 사용자만 가능)
// ======================
router.post("/", authenticateToken, async (req, res) => {
  const { tutorId, rating, comment } = req.body;
  const studentId = req.user.id;

  if (!tutorId || !rating || !comment) {
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

// ======================
// 리뷰 수정 (작성자 본인만 가능)
// ======================
router.put("/:id", authenticateToken, async (req, res) => {
  const { rating, comment } = req.body;
  const userId = req.user.id;

  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ detail: "리뷰 없음" });
    if (review.student.toString() !== userId) {
      return res.status(403).json({ detail: "권한이 없습니다." });
    }

    review.rating = rating;
    review.comment = comment;
    await review.save();

    res.json({ review });
  } catch (err) {
    console.error("리뷰 수정 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// ======================
// 리뷰 삭제 (작성자 본인만 가능)
// ======================
router.delete("/:id", authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ detail: "리뷰를 찾을 수 없습니다." });
    if (review.student.toString() !== userId) {
      return res.status(403).json({ detail: "권한이 없습니다." });
    }

    await review.deleteOne();
    res.json({ message: "리뷰가 삭제되었습니다." });
  } catch (err) {
    console.error("리뷰 삭제 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// ======================
// 특정 튜터 리뷰 목록 조회 (인증 불필요)
// ======================
router.get("/tutor/:tutorId", async (req, res) => {
  try {
    const reviews = await Review.find({ tutor: req.params.tutorId })
      .populate("student", "full_name email");
    res.json(reviews);
  } catch (err) {
    console.error("튜터 리뷰 조회 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// ======================
// 특정 튜터 평균 평점 조회 (인증 불필요)
// ======================
router.get("/tutor/:tutorId/average", async (req, res) => {
  const { tutorId } = req.params;

  try {
    const reviews = await Review.find({ tutor: tutorId });
    if (reviews.length === 0) {
      return res.json({ average: 0, count: 0 });
    }

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const average = total / reviews.length;

    res.json({ average: Number(average.toFixed(1)), count: reviews.length });
  } catch (err) {
    console.error("평균 평점 계산 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;