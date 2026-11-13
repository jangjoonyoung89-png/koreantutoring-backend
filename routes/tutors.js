const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const Booking = require("../models/Booking");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

// ----------------------
// ObjectId 유효성 검사
// ----------------------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ----------------------
// 로그인 회원 ID 확인
// ----------------------
function getUserId(req) {
  return req.user?.id || req.user?._id;
}

// ----------------------
// 튜터 본인 확인 미들웨어
// ----------------------
async function requireTutorOwner(req, res, next) {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "유효하지 않은 튜터 ID입니다.",
      });
    }

    const tutor = await Tutor.findOne({
      _id: id,
      userId,
    });

    if (!tutor) {
      return res.status(403).json({
        message: "본인의 튜터 정보만 수정할 수 있습니다.",
      });
    }

    if (!tutor.approved || tutor.rejected) {
      return res.status(403).json({
        message: "관리자 승인 후 이용할 수 있습니다.",
      });
    }

    req.tutor = tutor;
    next();
  } catch (err) {
    console.error("❌ 튜터 권한 확인 실패:", err);

    res.status(500).json({
      message: "튜터 권한 확인에 실패했습니다.",
    });
  }
}

// ----------------------
// 동영상 업로드 설정
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/videos");
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    cb(
      null,
      `tutor_${req.params.id}_${Date.now()}${ext}`
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = [
      ".mp4",
      ".webm",
      ".mov",
    ];

    const ext = path
      .extname(file.originalname)
      .toLowerCase();

    if (
      !file.mimetype.startsWith("video/") ||
      !allowedExtensions.includes(ext)
    ) {
      return cb(
        new Error("동영상 파일만 업로드할 수 있습니다.")
      );
    }

    cb(null, true);
  },
});

// ----------------------
// ⭐ 튜터 대시보드 조회
// 반드시 /:id보다 먼저 선언
// ----------------------
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRoles("tutor"),
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const tutor = await Tutor.findOne({
        userId,
      }).lean();

      if (!tutor) {
        return res.status(404).json({
          message: "연결된 튜터 프로필이 없습니다.",
        });
      }

      // 승인 전 튜터
      if (!tutor.approved || tutor.rejected) {
        return res.json({
          tutor,
          approved: false,
          bookings: [],
          reviews: [],
          averageRating: 0,
        });
      }

      // 실제 튜터 ID로 예약 및 리뷰 조회
      const [bookings, reviews] = await Promise.all([
        Booking.find({
          tutor: tutor._id,
        })
          .populate("student", "full_name")
          .sort({ date: 1, time: 1 })
          .lean(),

        Review.find({
          tutor: tutor._id,
        })
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      const averageRating =
        reviews.length > 0
          ? Number(
              (
                reviews.reduce(
                  (sum, review) =>
                    sum + Number(review.rating || 0),
                  0
                ) / reviews.length
              ).toFixed(1)
            )
          : 0;

      // 기존 프런트엔드 studentName 표시와 호환
      const formattedBookings = bookings.map(
        (booking) => ({
          ...booking,
          studentName:
            booking.student?.full_name ||
            "학습자",
        })
      );

      res.json({
        tutor,
        approved: true,
        bookings: formattedBookings,
        reviews,
        averageRating,
      });
    } catch (err) {
      console.error("❌ 대시보드 조회 실패:", err);

      res.status(500).json({
        message: "대시보드 정보를 불러오지 못했습니다.",
      });
    }
  }
);

// ----------------------
// ⭐ 내 튜터 프로필 조회
// ----------------------
router.get(
  "/me",
  authenticateToken,
  authorizeRoles("tutor"),
  async (req, res) => {
    try {
      const tutor = await Tutor.findOne({
        userId: getUserId(req),
      }).lean();

      if (!tutor) {
        return res.status(404).json({
          message: "튜터 프로필이 없습니다.",
        });
      }

      res.json(tutor);
    } catch (err) {
      console.error("❌ 내 프로필 조회 실패:", err);

      res.status(500).json({
        message: "프로필 조회에 실패했습니다.",
      });
    }
  }
);

// ----------------------
// ⭐ 내 튜터 프로필 수정
// ----------------------
router.patch(
  "/me",
  authenticateToken,
  authorizeRoles("tutor"),
  async (req, res) => {
    try {
      const tutor = await Tutor.findOne({
        userId: getUserId(req),
      });

      if (!tutor) {
        return res.status(404).json({
          message: "튜터 프로필이 없습니다.",
        });
      }

      if (!tutor.approved || tutor.rejected) {
        return res.status(403).json({
          message: "관리자 승인 후 수정할 수 있습니다.",
        });
      }

      const { name, bio, price, photo } = req.body;

      if (name !== undefined) {
        if (
          typeof name !== "string" ||
          !name.trim()
        ) {
          return res.status(400).json({
            message: "이름을 입력해 주세요.",
          });
        }

        tutor.name = name.trim();
      }

      if (bio !== undefined) {
        if (typeof bio !== "string") {
          return res.status(400).json({
            message: "소개를 올바르게 입력해 주세요.",
          });
        }

        tutor.bio = bio.trim();
      }

      if (price !== undefined) {
        const parsedPrice = Number(price);

        if (
          price === "" ||
          price === null ||
          !Number.isFinite(parsedPrice) ||
          parsedPrice < 0
        ) {
          return res.status(400).json({
            message: "올바른 수업료를 입력해 주세요.",
          });
        }

        tutor.price = parsedPrice;
      }

      if (photo !== undefined) {
        if (typeof photo !== "string") {
          return res.status(400).json({
            message: "올바른 사진 주소를 입력해 주세요.",
          });
        }

        tutor.photo = photo.trim();
      }

      await tutor.save();

      res.json({
        message: "프로필이 수정되었습니다.",
        tutor,
      });
    } catch (err) {
      console.error("❌ 프로필 수정 실패:", err);

      res.status(500).json({
        message: "프로필 수정에 실패했습니다.",
      });
    }
  }
);

// ----------------------
// 전체 공개 튜터 조회
// ----------------------
router.get("/", async (req, res) => {
  try {
    let tutors = await Tutor.find({
      approved: true,
      rejected: { $ne: true },
    })
      .select("-email -userId")
      .lean();

    tutors = await Promise.all(
      tutors.map(async (tutor) => {
        const reviews = await Review.find({
          tutor: tutor._id,
        }).lean();

        const averageRating =
          reviews.length > 0
            ? Number(
                (
                  reviews.reduce(
                    (sum, review) =>
                      sum + Number(review.rating || 0),
                    0
                  ) / reviews.length
                ).toFixed(1)
              )
            : null;

        return {
          ...tutor,
          averageRating,
          reviewCount: reviews.length,
        };
      })
    );

    res.json(tutors);
  } catch (err) {
    console.error("❌ 튜터 조회 실패:", err);

    res.status(500).json({
      message: "튜터 목록을 불러오지 못했습니다.",
    });
  }
});

// ----------------------
// 튜터 상세 조회
// ----------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "유효하지 않은 튜터 ID입니다.",
      });
    }

    const tutor = await Tutor.findOne({
      _id: id,
      approved: true,
      rejected: { $ne: true },
    })
      .select("-email -userId")
      .lean();

    if (!tutor) {
      return res.status(404).json({
        message: "튜터를 찾을 수 없습니다.",
      });
    }

    const reviews = await Review.find({
      tutor: id,
    }).lean();

    const averageRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce(
                (sum, review) =>
                  sum + Number(review.rating || 0),
                0
              ) / reviews.length
            ).toFixed(1)
          )
        : null;

    res.json({
      ...tutor,
      averageRating,
      reviewCount: reviews.length,
    });
  } catch (err) {
    console.error("❌ 튜터 상세 조회 실패:", err);

    res.status(500).json({
      message: "튜터 정보를 불러오지 못했습니다.",
    });
  }
});

// ----------------------
// 튜터 가능 시간 조회
// ----------------------
router.get("/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "유효하지 않은 튜터 ID입니다.",
      });
    }

    const tutor = await Tutor.findOne({
      _id: id,
      approved: true,
      rejected: { $ne: true },
    }).lean();

    if (!tutor) {
      return res.status(404).json({
        message: "튜터를 찾을 수 없습니다.",
      });
    }

    res.json({
      availableTimes: tutor.availableTimes || [],
    });
  } catch (err) {
    console.error("❌ 가능 시간 조회 실패:", err);

    res.status(500).json({
      message: "수업 가능 시간을 불러오지 못했습니다.",
    });
  }
});

// ----------------------
// ⭐ 날짜별 실제 수업 가능 시간 조회
// 예약 대기 및 확정 시간은 예약 마감 처리
// ----------------------
router.get("/:id/available-slots", async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    // 최신 예약 정보를 반환하도록 캐시 방지
    res.set("Cache-Control", "no-store");

    // 튜터 ID 확인
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "유효하지 않은 튜터 ID입니다.",
      });
    }

    // 날짜 형식 확인
    if (
      typeof date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return res.status(400).json({
        message: "올바른 날짜를 선택해 주세요.",
      });
    }

    const selectedDate = new Date(
      `${date}T00:00:00Z`
    );

    if (
      Number.isNaN(selectedDate.getTime()) ||
      selectedDate.toISOString().slice(0, 10) !== date
    ) {
      return res.status(400).json({
        message: "유효하지 않은 날짜입니다.",
      });
    }

    // 승인된 튜터만 조회
    const tutor = await Tutor.findOne({
      _id: id,
      approved: true,
      rejected: { $ne: true },
    })
      .select("availableTimes")
      .lean();

    if (!tutor) {
      return res.status(404).json({
        message: "예약 가능한 튜터가 아닙니다.",
      });
    }

    // 선택한 날짜의 요일 확인
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const day =
      dayNames[selectedDate.getUTCDay()];

    // 튜터가 설정한 해당 요일의 수업 시간
    const scheduledSlots = [
      ...new Set(
        (tutor.availableTimes || [])
          .filter((item) => item.day === day)
          .flatMap((item) => item.slots || [])
      ),
    ].sort();

    // 해당 날짜의 실제 예약 조회
    // 취소된 예약은 제외
    const bookings = await Booking.find({
      tutor: id,
      date,
      status: { $ne: "canceled" },
    })
      .select("time -_id")
      .lean();

    // 이미 예약된 시간
    const bookedSet = new Set(
      bookings.map((booking) => booking.time)
    );

    // 한국 시간 기준 현재 시각
    const now = Date.now();

    // 시간별 예약 가능 여부 계산
    const slots = scheduledSlots.map((time) => {
      const isBooked = bookedSet.has(time);

      const slotTime = new Date(
        `${date}T${time}:00+09:00`
      ).getTime();

      const isPast = slotTime <= now;

      return {
        time,
        available: !isBooked && !isPast,
        booked: isBooked,
        past: isPast,
        status: isBooked
          ? "booked"
          : isPast
          ? "past"
          : "available",
      };
    });

    // 예약 가능한 시간
    const availableSlots = slots
      .filter((slot) => slot.available)
      .map((slot) => slot.time);

    // 예약 마감 시간
    const bookedSlots = slots
      .filter((slot) => slot.booked)
      .map((slot) => slot.time);

    // 날짜별 실제 예약 정보 반환
    res.json({
      tutorId: id,
      date,
      day,
      slots,
      availableSlots,
      bookedSlots,
    });
  } catch (err) {
    console.error(
      "❌ 날짜별 수업 가능 시간 조회 실패:",
      err
    );

    res.status(500).json({
      message:
        "수업 가능 시간을 불러오지 못했습니다.",
    });
  }
});

// ----------------------
// 튜터 가능 시간 업데이트
// ----------------------
router.patch(
  "/:id/availability",
  authenticateToken,
  authorizeRoles("tutor"),
  requireTutorOwner,
  async (req, res) => {
    try {
      const { availableTimes } = req.body;

      if (!Array.isArray(availableTimes)) {
        return res.status(400).json({
          message: "올바른 수업 가능 시간을 입력해 주세요.",
        });
      }

      const validDays = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];

      const valid = availableTimes.every(
        (item) =>
          item &&
          validDays.includes(item.day) &&
          Array.isArray(item.slots) &&
          item.slots.every(
            (slot) =>
              typeof slot === "string" &&
              /^([01]\d|2[0-3]):[0-5]\d$/.test(slot)
          )
      );

      if (!valid) {
        return res.status(400).json({
          message: "요일 또는 시간 형식이 올바르지 않습니다.",
        });
      }

      req.tutor.availableTimes = availableTimes;
      await req.tutor.save();

      res.json({
        message: "수업 가능 시간이 수정되었습니다.",
        tutor: req.tutor,
      });
    } catch (err) {
      console.error("❌ 가능 시간 수정 실패:", err);

      res.status(500).json({
        message: "수업 가능 시간 수정에 실패했습니다.",
      });
    }
  }
);

// ----------------------
// 예약 생성
// ----------------------
router.post(
  "/bookings",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    try {
      const { tutorId, date, time } = req.body;

      if (
        !isValidObjectId(tutorId) ||
        typeof date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        typeof time !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
      ) {
        return res.status(400).json({
          message: "예약 정보를 올바르게 입력해 주세요.",
        });
      }

      const tutor = await Tutor.findOne({
        _id: tutorId,
        approved: true,
        rejected: { $ne: true },
      });

      if (!tutor) {
        return res.status(404).json({
          message: "예약 가능한 튜터가 아닙니다.",
        });
      }

      const selectedDate = new Date(
        `${date}T00:00:00Z`
      );

      if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate.toISOString().slice(0, 10) !== date
      ) {
        return res.status(400).json({
          message: "올바른 예약 날짜를 입력해 주세요.",
        });
      }

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];

      const day = dayNames[selectedDate.getUTCDay()];

      const available = (
        tutor.availableTimes || []
      ).some(
        (item) =>
          item.day === day &&
          item.slots.includes(time)
      );

      if (!available) {
        return res.status(400).json({
          message: "수업 가능 시간이 아닙니다.",
        });
      }

      // 취소되지 않은 예약만 중복 확인
      const exist = await Booking.findOne({
        tutor: tutorId,
        date,
        time,
        status: { $ne: "canceled" },
      });

      if (exist) {
        return res.status(409).json({
          message: "이미 예약된 시간입니다.",
        });
      }

      const booking = await Booking.create({
        tutor: tutorId,
        student: getUserId(req),
        date,
        time,
        status: "pending",
      });

      res.status(201).json({
        message: "예약이 완료되었습니다.",
        booking,
      });
    } catch (err) {
      console.error("❌ 예약 실패:", err);

      res.status(500).json({
        message: "예약 처리에 실패했습니다.",
      });
    }
  }
);

// ----------------------
// 튜터 소개 동영상 업로드
// ----------------------
router.post(
  "/:id/upload-video",
  authenticateToken,
  authorizeRoles("tutor"),
  requireTutorOwner,
  upload.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "파일이 업로드되지 않았습니다.",
        });
      }

      req.tutor.sampleVideoUrl =
        `/uploads/videos/${req.file.filename}`;

      await req.tutor.save();

      res.json({
        success: true,
        message: "소개 영상이 등록되었습니다.",
        sampleVideoUrl: req.tutor.sampleVideoUrl,
      });
    } catch (err) {
      console.error("❌ 영상 업로드 실패:", err);

      res.status(500).json({
        message: "영상 업로드에 실패했습니다.",
      });
    }
  }
);

// ----------------------
// 파일 업로드 오류 처리
// ----------------------
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      message:
        err.code === "LIMIT_FILE_SIZE"
          ? "영상 파일은 100MB 이하로 등록해 주세요."
          : "파일 업로드에 실패했습니다.",
    });
  }

  if (err) {
    console.error("❌ 튜터 API 오류:", err);

    return res.status(400).json({
      message: err.message || "요청 처리에 실패했습니다.",
    });
  }

  next();
});

module.exports = router;