const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Booking = require("../models/Booking");
const Tutor = require("../models/Tutor");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

const sendNotification = require("../utils/sendNotification");

// ==============================
// 공통 함수
// ==============================
const getUserId = (req) => {
  return req.user?.id || req.user?._id;
};

const isValidId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// 로그인한 튜터의 실제 프로필 조회
const getTutorProfile = async (req) => {
  return Tutor.findOne({
    userId: getUserId(req),
  });
};

// ==============================
// 1. 예약 목록 조회
// GET /bookings
// ==============================
router.get(
  "/",
  authenticateToken,
  authorizeRoles("student", "tutor", "admin"),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const role = req.user.role;
      const filter = {};

      // 학습자는 자신의 예약만 조회
      if (role === "student") {
        filter.student = userId;
      }

      // 튜터는 자신의 수업 예약만 조회
      if (role === "tutor") {
        const tutor = await getTutorProfile(req);

        if (!tutor) {
          return res.status(404).json({
            message: "튜터 프로필을 찾을 수 없습니다.",
          });
        }

        filter.tutor = tutor._id;
      }

      // 관리자는 전체 예약 및 필터 조회 가능
      if (role === "admin") {
        const { studentId, tutorId } = req.query;

        if (studentId) {
          if (!isValidId(studentId)) {
            return res.status(400).json({
              message: "올바르지 않은 학습자 ID입니다.",
            });
          }

          filter.student = studentId;
        }

        if (tutorId) {
          if (!isValidId(tutorId)) {
            return res.status(400).json({
              message: "올바르지 않은 튜터 ID입니다.",
            });
          }

          filter.tutor = tutorId;
        }
      }

      const bookings = await Booking.find(filter)
        .populate("tutor", "name photo price")
        .populate("student", "full_name")
        .sort({ date: 1, time: 1 });

      return res.json(bookings);
    } catch (err) {
      console.error("예약 목록 조회 실패:", err);

      return res.status(500).json({
        message: "예약 목록을 불러오지 못했습니다.",
      });
    }
  }
);

// ==============================
// 2. 튜터 예약 확정
// PATCH /bookings/:id/confirm
// ==============================
router.patch(
  "/:id/confirm",
  authenticateToken,
  authorizeRoles("tutor"),
  async (req, res) => {
    try {
      const bookingId = req.params.id;

      if (!isValidId(bookingId)) {
        return res.status(400).json({
          message: "올바르지 않은 예약 ID입니다.",
        });
      }

      const tutor = await getTutorProfile(req);

      if (!tutor) {
        return res.status(404).json({
          message: "튜터 프로필을 찾을 수 없습니다.",
        });
      }

      if (!tutor.approved || tutor.rejected) {
        return res.status(403).json({
          message: "승인된 튜터만 예약을 확정할 수 있습니다.",
        });
      }

      // 본인의 대기 중인 예약만 확정
      const booking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          tutor: tutor._id,
          status: "pending",
        },
        {
          $set: { status: "confirmed" },
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("tutor", "name photo price")
        .populate("student", "full_name");

      if (!booking) {
        return res.status(409).json({
          message:
            "확정할 수 없는 예약입니다. 예약 상태를 확인해 주세요.",
        });
      }

      return res.json({
        message: "수업 예약이 확정되었습니다.",
        booking,
      });
    } catch (err) {
      console.error("예약 확정 실패:", err);

      return res.status(500).json({
        message: "예약 확정 중 오류가 발생했습니다.",
      });
    }
  }
);

// ==============================
// 3. 튜터 예약 거절
// PATCH /bookings/:id/reject
// ==============================
router.patch(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("tutor"),
  async (req, res) => {
    try {
      const bookingId = req.params.id;

      if (!isValidId(bookingId)) {
        return res.status(400).json({
          message: "올바르지 않은 예약 ID입니다.",
        });
      }

      const tutor = await getTutorProfile(req);

      if (!tutor) {
        return res.status(404).json({
          message: "튜터 프로필을 찾을 수 없습니다.",
        });
      }

      if (!tutor.approved || tutor.rejected) {
        return res.status(403).json({
          message: "승인된 튜터만 예약을 처리할 수 있습니다.",
        });
      }

      // 본인의 대기 중인 예약만 거절
      const booking = await Booking.findOneAndUpdate(
        {
          _id: bookingId,
          tutor: tutor._id,
          status: "pending",
        },
        {
          $set: { status: "canceled" },
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate("tutor", "name photo price")
        .populate("student", "full_name");

      if (!booking) {
        return res.status(409).json({
          message:
            "거절할 수 없는 예약입니다. 예약 상태를 확인해 주세요.",
        });
      }

      return res.json({
        message: "수업 예약이 거절되었습니다.",
        booking,
      });
    } catch (err) {
      console.error("예약 거절 실패:", err);

      return res.status(500).json({
        message: "예약 거절 중 오류가 발생했습니다.",
      });
    }
  }
);

// ==============================
// 4. 학습자 예약 취소
// DELETE /bookings/:id
// ==============================
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("student", "admin"),
  async (req, res) => {
    try {
      const bookingId = req.params.id;

      if (!isValidId(bookingId)) {
        return res.status(400).json({
          message: "올바르지 않은 예약 ID입니다.",
        });
      }

      const filter = {
        _id: bookingId,
        status: { $in: ["pending", "confirmed"] },
      };

      // 학습자는 본인의 예약만 취소 가능
      if (req.user.role === "student") {
        filter.student = getUserId(req);
      }

      // 예약 기록을 삭제하지 않고 상태만 변경
      const booking = await Booking.findOneAndUpdate(
        filter,
        {
          $set: { status: "canceled" },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!booking) {
        return res.status(404).json({
          message: "취소할 수 있는 예약을 찾지 못했습니다.",
        });
      }

      return res.json({
        message: "예약이 취소되었습니다.",
        booking,
      });
    } catch (err) {
      console.error("예약 취소 실패:", err);

      return res.status(500).json({
        message: "예약 취소 중 오류가 발생했습니다.",
      });
    }
  }
);

// ==============================
// 5. 학습자 예약 생성
// POST /bookings
// ==============================
router.post(
  "/",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const student = getUserId(req);

      const {
        tutor,
        tutorId,
        date,
        time,
        notes,
      } = req.body;

      // 기존 프론트엔드 요청 형식 호환
      const selectedTutorId = tutor || tutorId;

      if (
        !isValidId(student) ||
        !isValidId(selectedTutorId) ||
        typeof date !== "string" ||
        typeof time !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      ) {
        return res.status(400).json({
          message: "예약 정보를 올바르게 입력해 주세요.",
        });
      }

      // 날짜 유효성 확인
      const selectedDate = new Date(
        `${date}T00:00:00Z`
      );

      if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate.toISOString().slice(0, 10) !== date
      ) {
        return res.status(400).json({
          message: "올바른 수업 날짜를 선택해 주세요.",
        });
      }

      // 한국 시간 기준으로 지난 시간 예약 방지
      const lessonStart = new Date(
        `${date}T${time}:00+09:00`
      );

      if (lessonStart.getTime() <= Date.now()) {
        return res.status(400).json({
          message: "이미 지난 시간은 예약할 수 없습니다.",
        });
      }

      // 승인된 튜터인지 확인
      const tutorProfile = await Tutor.findOne({
        _id: selectedTutorId,
        approved: true,
        rejected: { $ne: true },
      });

      if (!tutorProfile) {
        return res.status(404).json({
          message: "예약 가능한 튜터를 찾지 못했습니다.",
        });
      }

      // 요일별 수업 가능 시간 확인
      const daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const day = daysOfWeek[
        selectedDate.getUTCDay()
      ];

      const dayAvailability =
        tutorProfile.availableTimes?.find(
          (item) => item.day === day
        );

      if (!dayAvailability?.slots?.includes(time)) {
        return res.status(400).json({
          message: "튜터가 설정한 수업 가능 시간이 아닙니다.",
        });
      }

      // 취소된 예약을 제외하고 중복 확인
      const existing = await Booking.findOne({
        tutor: tutorProfile._id,
        date,
        time,
        status: { $ne: "canceled" },
      });

      if (existing) {
        return res.status(409).json({
          message: "이미 예약된 시간입니다.",
        });
      }

      const booking = await Booking.create({
        student,
        tutor: tutorProfile._id,
        date,
        time,
        notes: typeof notes === "string" ? notes : "",
        status: "pending",
      });

      // 알림 실패가 예약 성공에 영향을 주지 않도록 분리
      try {
        if (tutorProfile.userId) {
          await sendNotification({
            recipientId: tutorProfile.userId,
            message: `새 예약이 들어왔습니다: ${date} ${time}`,
            type: "booking",
            link: "/tutor/dashboard",
          });
        }
      } catch (notificationError) {
        console.error(
          "예약 알림 전송 실패:",
          notificationError.message
        );
      }

      return res.status(201).json({
        message: "수업 예약 신청이 완료되었습니다.",
        booking,
      });
    } catch (err) {
      console.error("예약 생성 실패:", err);

      return res.status(500).json({
        message: "예약 중 서버 오류가 발생했습니다.",
      });
    }
  }
);

module.exports = router;