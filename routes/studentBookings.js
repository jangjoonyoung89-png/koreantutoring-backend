const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Booking = require("../models/Booking");
const Review = require("../models/Review");
const requireAuth = require("../middleware/requireAuth");

// ==========================================
// ROKMUN 학습자 예약 관리
// ==========================================

// ======================
// 공통 함수
// ======================

const getStudentId = (req) => {
  return (
    req.user?.id ||
    req.user?.userId ||
    req.user?._id
  );
};

const isValidId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ======================
// 1. 학생 본인 예약 내역 조회
// GET /my-bookings
// ======================

router.get(
  "/",
  requireAuth("student"),
  async (req, res) => {
    try {
      const studentId = getStudentId(req);

      if (!studentId || !isValidId(studentId)) {
        return res.status(401).json({
          detail: "회원 정보를 확인할 수 없습니다.",
        });
      }

      // 본인의 전체 예약 이력 조회
      // 대기 / 확정 / 취소 / 완료 모두 포함
      const bookings = await Booking.find({
        student: studentId,
      })
        .populate(
          "tutor",
          "full_name name email sampleVideoUrl"
        )
        .sort({ date: 1, time: 1 })
        .lean();

      // ======================
      // 완료된 수업의 예약 ID 수집
      // ======================

      const completedBookingIds = bookings
        .filter(
          (booking) =>
            booking.status === "completed"
        )
        .map((booking) => booking._id);

      // ======================
      // 본인이 작성한 수업 리뷰 조회
      // ======================

      const reviews =
        completedBookingIds.length > 0
          ? await Review.find({
              student: studentId,
              booking: {
                $in: completedBookingIds,
              },
            })
              .select(
                "_id booking rating comment createdAt"
              )
              .lean()
          : [];

      // ======================
      // 예약 ID별 리뷰 연결
      // ======================

      const reviewMap = new Map();

      reviews.forEach((review) => {
        if (review.booking) {
          reviewMap.set(
            String(review.booking),
            review
          );
        }
      });

      // ======================
      // 예약별 리뷰 작성 여부 추가
      // ======================

      const bookingsWithReview = bookings.map(
        (booking) => {
          const review = reviewMap.get(
            String(booking._id)
          );

          return {
            ...booking,

            // 리뷰 작성 여부
            reviewed: Boolean(review),

            // 작성한 리뷰 정보
            review: review
              ? {
                  _id: review._id,
                  rating: review.rating,
                  comment: review.comment,
                  createdAt: review.createdAt,
                }
              : null,
          };
        }
      );

      // 기존 배열 응답 구조 유지
      return res.json(bookingsWithReview);

    } catch (err) {
      console.error(
        "학생 예약 내역 조회 오류:",
        err
      );

      return res.status(500).json({
        detail:
          "예약 데이터를 불러오는 중 오류가 발생했습니다.",
      });
    }
  }
);

// ======================
// 2. 학생 본인 예약 취소
// DELETE /my-bookings/:id
// ======================

router.delete(
  "/:id",
  requireAuth("student"),
  async (req, res) => {
    try {
      const studentId = getStudentId(req);
      const bookingId = req.params.id;

      // 1. 학습자 정보 확인
      if (!studentId || !isValidId(studentId)) {
        return res.status(401).json({
          message:
            "회원 정보를 확인할 수 없습니다.",
        });
      }

      // 2. 예약 ID 유효성 검사
      if (!isValidId(bookingId)) {
        return res.status(400).json({
          message:
            "올바르지 않은 예약 ID입니다.",
        });
      }

      // 3. 본인의 예약만 조회
      const existingBooking =
        await Booking.findOne({
          _id: bookingId,
          student: studentId,
        });

      if (!existingBooking) {
        return res.status(404).json({
          message:
            "취소할 수 있는 본인의 예약을 찾지 못했습니다.",
        });
      }

      // 4. 완료된 수업은 취소 불가
      if (
        existingBooking.status === "completed"
      ) {
        return res.status(409).json({
          message:
            "완료된 수업은 취소할 수 없습니다.",
        });
      }

      // 5. 이미 취소된 예약 확인
      if (
        existingBooking.status === "canceled"
      ) {
        return res.status(409).json({
          message:
            "이미 취소된 예약입니다.",
        });
      }

      // 6. 예약 대기 또는 확정 상태만 취소
      if (
        !["pending", "confirmed"].includes(
          existingBooking.status
        )
      ) {
        return res.status(409).json({
          message:
            "현재 상태에서는 예약을 취소할 수 없습니다.",
        });
      }

      // 7. 예약 기록 보존
      // 기존 deleteOne() 방식 제거
      //
      // 상태와 소유권을 다시 확인하여
      // 수업 완료 처리와 예약 취소가 동시에
      // 실행되어도 완료 기록이 삭제되지 않도록 보호

      const booking =
        await Booking.findOneAndUpdate(
          {
            _id: bookingId,
            student: studentId,
            status: {
              $in: ["pending", "confirmed"],
            },
          },
          {
            $set: {
              status: "canceled",
            },
          },
          {
            new: true,
            runValidators: true,
          }
        ).populate(
          "tutor",
          "full_name name email sampleVideoUrl"
        );

      // 다른 요청에 의해 예약 상태가
      // 변경되었는지 확인
      if (!booking) {
        return res.status(409).json({
          message:
            "예약 상태가 변경되었습니다. 다시 확인해 주세요.",
        });
      }

      // 8. 예약 취소 성공
      return res.json({
        message: "예약이 취소되었습니다.",
        booking,
      });

    } catch (err) {
      console.error(
        "예약 취소 오류:",
        err
      );

      return res.status(500).json({
        message:
          "서버 오류로 인해 예약 취소에 실패했습니다.",
      });
    }
  }
);

module.exports = router;