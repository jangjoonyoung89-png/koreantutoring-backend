const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Tutor = require("../models/Tutor");

const {
  authenticateToken,
} = require("../middleware/auth");

// ======================
// 공통 설정
// ======================
const MAX_COMMENT_LENGTH = 1000;

// ======================
// 공통 유틸리티
// ======================
const getUserId = (req) => {
  return (
    req.user?.id ||
    req.user?._id ||
    req.user?.userId
  );
};

const isValidId = (id) => {
  return (
    typeof id === "string" &&
    /^[a-fA-F0-9]{24}$/.test(id) &&
    mongoose.Types.ObjectId.isValid(id)
  );
};

const isValidRating = (rating) => {
  return (
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5
  );
};

const isValidComment = (comment) => {
  return (
    typeof comment === "string" &&
    comment.trim().length > 0 &&
    comment.trim().length <= MAX_COMMENT_LENGTH
  );
};

// ======================
// 학습자 권한 확인
// ======================
const requireStudent = (req, res, next) => {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      message: "로그인이 필요합니다.",
    });
  }

  if (req.user?.role !== "student") {
    return res.status(403).json({
      message: "학습자만 이용할 수 있습니다.",
    });
  }

  next();
};

// ======================
// 튜터 평균 평점 갱신
// ======================
const updateTutorRating = async (tutorId) => {
  const result = await Review.aggregate([
    {
      $match: {
        tutor: new mongoose.Types.ObjectId(
          String(tutorId)
        ),
      },
    },
    {
      $group: {
        _id: null,
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const average =
    result.length > 0
      ? Number(result[0].average.toFixed(1))
      : 0;

  const count =
    result.length > 0
      ? result[0].count
      : 0;

  await Tutor.findByIdAndUpdate(tutorId, {
    averageRating: average,
    reviewCount: count,
  });

  return { average, count };
};

// ======================
// 1. 학습자 본인의 리뷰 조회
// GET /api/reviews/student/:studentId
// ======================
router.get(
  "/student/:studentId",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    try {
      const { studentId } = req.params;
      const currentUserId = getUserId(req);

      if (!isValidId(studentId)) {
        return res.status(400).json({
          message: "올바르지 않은 학습자 ID입니다.",
        });
      }

      if (
        String(currentUserId) !==
        String(studentId)
      ) {
        return res.status(403).json({
          message:
            "본인의 리뷰만 조회할 수 있습니다.",
        });
      }

      const reviews = await Review.find({
        student: studentId,
      })
        .populate(
          "tutor",
          "name full_name photo"
        )
        .populate(
          "booking",
          "date time status completedAt"
        )
        .sort({ createdAt: -1 });

      return res.json(reviews);
    } catch (err) {
      console.error(
        "학습자 리뷰 조회 오류:",
        err
      );

      return res.status(500).json({
        message:
          "리뷰를 조회하는 중 오류가 발생했습니다.",
      });
    }
  }
);

// ======================
// 2. 리뷰 작성
// POST /api/reviews
// ======================
router.post(
  "/",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    try {
      const studentId = getUserId(req);

      const {
        bookingId,
        tutorId,
        rating,
        comment,
      } = req.body || {};

      // 예약 ID 검증
      if (!isValidId(bookingId)) {
        return res.status(400).json({
          message:
            "올바른 수업 예약 정보가 필요합니다.",
        });
      }

      // 튜터 ID 검증
      if (!isValidId(tutorId)) {
        return res.status(400).json({
          message:
            "올바른 튜터 정보가 필요합니다.",
        });
      }

      // 평점 검증
      if (!isValidRating(rating)) {
        return res.status(400).json({
          message:
            "평점은 1부터 5까지의 정수여야 합니다.",
        });
      }

      // 리뷰 내용 검증
      if (!isValidComment(comment)) {
        return res.status(400).json({
          message:
            "리뷰 내용을 1자 이상 1,000자 이하로 작성해 주세요.",
        });
      }

      // 본인의 수업 예약인지 확인
      const booking = await Booking.findOne({
        _id: bookingId,
        student: studentId,
      });

      if (!booking) {
        return res.status(404).json({
          message:
            "본인의 수업 예약을 찾을 수 없습니다.",
        });
      }

      // 수업 완료 여부 확인
      if (booking.status !== "completed") {
        return res.status(403).json({
          message:
            "수업이 완료된 후 리뷰를 작성할 수 있습니다.",
        });
      }

      // 예약된 튜터와 일치하는지 확인
      if (
        String(booking.tutor) !==
        String(tutorId)
      ) {
        return res.status(400).json({
          message:
            "예약된 튜터 정보와 일치하지 않습니다.",
        });
      }

      // 기존 리뷰 확인
      const existingReview =
        await Review.findOne({
          booking: booking._id,
        });

      if (existingReview) {
        return res.status(409).json({
          message:
            "이미 이 수업에 대한 리뷰를 작성하셨습니다.",
        });
      }

      // 리뷰 저장
      const review = await Review.create({
        booking: booking._id,
        tutor: booking.tutor,
        student: studentId,
        rating,
        comment: comment.trim(),
      });

      // 기존 Review 모델의 save 미들웨어에서
      // 튜터 평균 평점 및 리뷰 수 자동 갱신

      return res.status(201).json({
        message:
          "수업 리뷰가 등록되었습니다.",
        review,
      });
    } catch (err) {
      console.error("리뷰 작성 오류:", err);

      // 동시에 중복 리뷰를 작성하는 경우
      // MongoDB 고유 인덱스 오류 처리
      if (err.code === 11000) {
        return res.status(409).json({
          message:
            "이미 이 수업에 대한 리뷰를 작성하셨습니다.",
        });
      }

      if (err.name === "ValidationError") {
        return res.status(400).json({
          message:
            "리뷰 입력 정보를 확인해 주세요.",
        });
      }

      return res.status(500).json({
        message:
          "리뷰 작성 중 오류가 발생했습니다.",
      });
    }
  }
);

// ======================
// 3. 리뷰 수정
// PUT /api/reviews/:id
// ======================
router.put(
  "/:id",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    try {
      const { id } = req.params;
      const studentId = getUserId(req);

      const {
        rating,
        comment,
      } = req.body || {};

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "올바르지 않은 리뷰 ID입니다.",
        });
      }

      if (!isValidRating(rating)) {
        return res.status(400).json({
          message:
            "평점은 1부터 5까지의 정수여야 합니다.",
        });
      }

      if (!isValidComment(comment)) {
        return res.status(400).json({
          message:
            "리뷰 내용을 1자 이상 1,000자 이하로 작성해 주세요.",
        });
      }

      // 본인의 리뷰만 수정 가능
      const review = await Review.findOne({
        _id: id,
        student: studentId,
      });

      if (!review) {
        return res.status(404).json({
          message:
            "수정할 수 있는 리뷰를 찾을 수 없습니다.",
        });
      }

      // 예약, 튜터, 작성자는 변경하지 않음
      review.rating = rating;
      review.comment = comment.trim();

      // save 미들웨어에서 평균 평점 갱신
      await review.save();

      return res.json({
        message:
          "리뷰가 수정되었습니다.",
        review,
      });
    } catch (err) {
      console.error("리뷰 수정 오류:", err);

      if (err.name === "ValidationError") {
        return res.status(400).json({
          message:
            "리뷰 입력 정보를 확인해 주세요.",
        });
      }

      return res.status(500).json({
        message:
          "리뷰 수정 중 오류가 발생했습니다.",
      });
    }
  }
);

// ======================
// 4. 리뷰 삭제
// DELETE /api/reviews/:id
// ======================
router.delete(
  "/:id",
  authenticateToken,
  requireStudent,
  async (req, res) => {
    try {
      const { id } = req.params;
      const studentId = getUserId(req);

      if (!isValidId(id)) {
        return res.status(400).json({
          message:
            "올바르지 않은 리뷰 ID입니다.",
        });
      }

      // 본인의 리뷰만 삭제 가능
      const review =
        await Review.findOneAndDelete({
          _id: id,
          student: studentId,
        });

      if (!review) {
        return res.status(404).json({
          message:
            "삭제할 수 있는 리뷰를 찾을 수 없습니다.",
        });
      }

      // 리뷰 삭제 후 평균 평점 및 리뷰 수 갱신
      try {
        await updateTutorRating(
          review.tutor
        );
      } catch (ratingError) {
        console.error(
          "리뷰 삭제 후 평점 갱신 오류:",
          ratingError
        );
      }

      return res.json({
        message:
          "리뷰가 삭제되었습니다.",
      });
    } catch (err) {
      console.error("리뷰 삭제 오류:", err);

      return res.status(500).json({
        message:
          "리뷰 삭제 중 오류가 발생했습니다.",
      });
    }
  }
);

// ======================
// 5. 튜터 평균 평점 조회
// GET /api/reviews/tutor/:tutorId/average
// ======================
router.get(
  "/tutor/:tutorId/average",
  async (req, res) => {
    try {
      const { tutorId } = req.params;

      if (!isValidId(tutorId)) {
        return res.status(400).json({
          message:
            "올바르지 않은 튜터 ID입니다.",
        });
      }

      const result = await Review.aggregate([
        {
          $match: {
            tutor:
              new mongoose.Types.ObjectId(
                tutorId
              ),
          },
        },
        {
          $group: {
            _id: null,
            average: { $avg: "$rating" },
            count: { $sum: 1 },
          },
        },
      ]);

      if (result.length === 0) {
        return res.json({
          average: 0,
          count: 0,
        });
      }

      return res.json({
        average: Number(
          result[0].average.toFixed(1)
        ),
        count: result[0].count,
      });
    } catch (err) {
      console.error(
        "평균 평점 조회 오류:",
        err
      );

      return res.status(500).json({
        message:
          "평균 평점을 조회하는 중 오류가 발생했습니다.",
      });
    }
  }
);

// ======================
// 6. 튜터 공개 리뷰 조회
// GET /api/reviews/tutor/:tutorId
// ======================
router.get(
  "/tutor/:tutorId",
  async (req, res) => {
    try {
      const { tutorId } = req.params;

      if (!isValidId(tutorId)) {
        return res.status(400).json({
          message:
            "올바르지 않은 튜터 ID입니다.",
        });
      }

      const reviews = await Review.find({
        tutor: tutorId,
      })
        .select(
          "tutor student rating comment createdAt updatedAt"
        )
        .populate(
          "student",
          "full_name"
        )
        .sort({ createdAt: -1 });

      // 공개 리뷰에서는 학습자 이메일,
      // 예약 정보 등을 노출하지 않음

      return res.json(reviews);
    } catch (err) {
      console.error(
        "튜터 리뷰 조회 오류:",
        err
      );

      return res.status(500).json({
        message:
          "리뷰를 조회하는 중 오류가 발생했습니다.",
      });
    }
  }
);

// ======================
// 라우터 내보내기
// ======================
module.exports = router;