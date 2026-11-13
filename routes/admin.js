const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Material = require("../models/Material");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

// ===================================================
// 📂 업로드 폴더 자동 생성
// ===================================================
const uploadDir = path.join(
  __dirname,
  "../uploads/materials"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ===================================================
// 📁 Multer 설정 (자료 업로드)
// ===================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `material_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// ===================================================
// 🧾 관리자 로그인
// ===================================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "이메일과 비밀번호를 모두 입력하세요.",
      });
    }

    const admin = await User.findOne({
      email: email.trim().toLowerCase(),
      role: "admin",
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      admin.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      success: true,
      message: "관리자 로그인 성공",
      token,
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        full_name: admin.full_name,
      },
    });
  } catch (err) {
    console.error("관리자 로그인 오류:", err);

    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
});

// ===================================================
// 📧 관리자 비밀번호 재설정 요청
// ===================================================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "이메일을 입력해 주세요.",
      });
    }

    const admin = await User.findOne({
      email: email.trim().toLowerCase(),
      role: "admin",
    });

    if (!admin) {
      return res.json({
        success: true,
        message: "재설정 링크를 이메일로 전송했습니다.",
      });
    }

    const resetToken = crypto
      .randomBytes(32)
      .toString("hex");

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    admin.resetToken = `admin:${resetTokenHash}`;

    admin.resetTokenExpire =
      Date.now() + 3600000;

    await admin.save();

    const FRONTEND_URL =
      process.env.FRONTEND_URL ||
      "http://localhost:3000";

    const resetLink =
      `${FRONTEND_URL}/admin/reset-password/${resetToken}`;

    const subject =
      "ROKMUN 관리자 비밀번호 재설정 안내";

    const html = `
      <h2 style="color: #0077CC;">ROKMUN</h2>

      <p>안녕하세요, 관리자님.</p>

      <p>
        비밀번호를 재설정하려면
        아래 링크를 클릭해 주세요.
      </p>

      <a href="${resetLink}" target="_blank">
        비밀번호 재설정
      </a>

      <p>이 링크는 1시간 후 만료됩니다.</p>
    `;

    await sendEmail(admin.email, subject, html);

    res.json({
      success: true,
      message: "재설정 링크를 이메일로 전송했습니다.",
    });
  } catch (err) {
    console.error(
      "관리자 비밀번호 재설정 오류:",
      err
    );

    res.status(500).json({
      success: false,
      message: "서버 오류가 발생했습니다.",
    });
  }
});

// ===================================================
// 🔑 관리자 비밀번호 실제 재설정
// ===================================================
router.post(
  "/reset-password/:token",
  async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (
        typeof password !== "string" ||
        password.length < 8
      ) {
        return res.status(400).json({
          success: false,
          message: "비밀번호는 8자 이상이어야 합니다.",
        });
      }

      const resetTokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const admin = await User.findOne({
        resetToken: `admin:${resetTokenHash}`,
        resetTokenExpire: {
          $gt: Date.now(),
        },
        role: "admin",
      });

      if (!admin) {
        return res.status(400).json({
          success: false,
          message: "토큰이 유효하지 않거나 만료되었습니다.",
        });
      }

      // User 모델에서 자동으로 비밀번호 해시 처리
      admin.password = password;

      admin.resetToken = null;
      admin.resetTokenExpire = null;

      await admin.save();

      res.json({
        success: true,
        message: "비밀번호가 성공적으로 재설정되었습니다.",
      });
    } catch (err) {
      console.error(
        "관리자 비밀번호 변경 오류:",
        err
      );

      res.status(500).json({
        success: false,
        message: "서버 오류가 발생했습니다.",
      });
    }
  }
);

// ===================================================
// 🔐 관리자 인증 미들웨어 적용
// ===================================================
router.use(authenticateToken);
router.use(authorizeRoles("admin"));

// ===================================================
// 👩‍🏫 승인 대기 튜터 목록 조회
// ===================================================
router.get("/tutors/pending", async (req, res) => {
  try {
    const tutors = await Tutor.find({
      approved: false,
      rejected: { $ne: true },
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      tutors,
    });
  } catch (error) {
    console.error(
      "튜터 목록 조회 실패:",
      error
    );

    res.status(500).json({
      success: false,
      message: "튜터 목록 조회 실패",
    });
  }
});

// ===================================================
// 👩‍🏫 튜터 승인 및 거절 공통 처리
// User와 Tutor의 상태를 함께 변경
// ===================================================
async function changeTutorApproval(
  req,
  res,
  approved
) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "잘못된 튜터 ID입니다.",
    });
  }

  let session;

  try {
    session = await mongoose.startSession();

    let tutor;

    await session.withTransaction(async () => {
      // 튜터 프로필 확인
      tutor = await Tutor.findById(id)
        .session(session);

      if (!tutor) {
        const error = new Error(
          "튜터를 찾을 수 없습니다."
        );

        error.status = 404;
        throw error;
      }

      // 회원 계정 연결 여부 확인
      if (!tutor.userId) {
        const error = new Error(
          "회원 계정과 연결되지 않은 튜터입니다."
        );

        error.status = 409;
        throw error;
      }

      // 연결된 회원 계정 확인
      const user = await User.findOne({
        _id: tutor.userId,
        role: "tutor",
      }).session(session);

      if (!user) {
        const error = new Error(
          "연결된 튜터 회원을 찾을 수 없습니다."
        );

        error.status = 409;
        throw error;
      }

      // 튜터 프로필 승인 상태 변경
      tutor.approved = approved;
      tutor.rejected = !approved;

      // 회원 계정 인증 상태 변경
      user.tutorVerified = approved;

      // 두 데이터를 함께 저장
      await tutor.save({ session });
      await user.save({ session });
    });

    console.log(
      approved
        ? "튜터 승인 완료:"
        : "튜터 거절 완료:",
      tutor.name
    );

    res.json({
      success: true,
      message: approved
        ? "튜터 승인 완료"
        : "튜터 거절 완료",
      tutor,
    });
  } catch (error) {
    console.error(
      "튜터 상태 변경 실패:",
      error
    );

    res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : "튜터 상태 변경 실패",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

// ===================================================
// ✅ 튜터 승인
// ===================================================
router.patch(
  "/tutors/:id/approve",
  (req, res) => {
    return changeTutorApproval(
      req,
      res,
      true
    );
  }
);

// ===================================================
// ❌ 튜터 거절
// ===================================================
router.patch(
  "/tutors/:id/reject",
  (req, res) => {
    return changeTutorApproval(
      req,
      res,
      false
    );
  }
);

// ===================================================
// 💬 리뷰 관리 - 전체 조회
// ===================================================
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("student", "full_name email")
      .populate("tutor", "name email");

    res.json({
      success: true,
      reviews,
    });
  } catch (err) {
    console.error("리뷰 조회 오류:", err);

    res.status(500).json({
      success: false,
      message: "리뷰 조회 중 서버 오류",
    });
  }
});

// ===================================================
// 💬 리뷰 삭제
// ===================================================
router.delete("/reviews/:id", async (req, res) => {
  try {
    const review = await Review.findById(
      req.params.id
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "리뷰를 찾을 수 없습니다.",
      });
    }

    await review.deleteOne();

    res.json({
      success: true,
      message: "리뷰 삭제 완료",
    });
  } catch (err) {
    console.error("리뷰 삭제 오류:", err);

    res.status(500).json({
      success: false,
      message: "리뷰 삭제 중 서버 오류",
    });
  }
});

// ===================================================
// 📚 자료 업로드
// ===================================================
router.post(
  "/materials",
  upload.single("file"),
  async (req, res) => {
    const { title, description } = req.body;

    if (!req.file || !title) {
      return res.status(400).json({
        success: false,
        message: "제목과 파일이 필요합니다.",
      });
    }

    try {
      const material = new Material({
        title,
        description,
        fileUrl:
          `/uploads/materials/${req.file.filename}`,
      });

      await material.save();

      res.status(201).json({
        success: true,
        message: "자료 업로드 완료",
        material,
      });
    } catch (err) {
      console.error("자료 업로드 오류:", err);

      res.status(500).json({
        success: false,
        message: "자료 업로드 중 서버 오류",
      });
    }
  }
);

// ===================================================
// 📚 자료 전체 조회
// ===================================================
router.get("/materials", async (req, res) => {
  try {
    const materials = await Material.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      materials,
    });
  } catch (err) {
    console.error("자료 조회 오류:", err);

    res.status(500).json({
      success: false,
      message: "자료 조회 중 서버 오류",
    });
  }
});

// ===================================================
// 📚 자료 삭제
// ===================================================
router.delete(
  "/materials/:id",
  async (req, res) => {
    try {
      const material = await Material.findById(
        req.params.id
      );

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "자료를 찾을 수 없습니다.",
        });
      }

      const filePath = path.join(
        __dirname,
        "..",
        material.fileUrl
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await material.deleteOne();

      res.json({
        success: true,
        message: "자료 삭제 완료",
      });
    } catch (err) {
      console.error("자료 삭제 오류:", err);

      res.status(500).json({
        success: false,
        message: "자료 삭제 중 서버 오류",
      });
    }
  }
);

// ===================================================
// 📊 관리자 통계 API
// ===================================================
router.get("/stats", async (req, res) => {
  try {
    const totalTutors =
      await Tutor.countDocuments();

    const totalApprovedTutors =
      await Tutor.countDocuments({
        approved: true,
      });

    const totalBookings =
      await Booking.countDocuments();

    const totalReviews =
      await Review.countDocuments();

    const avgRatingData =
      await Review.aggregate([
        {
          $group: {
            _id: null,
            avgRating: {
              $avg: "$rating",
            },
          },
        },
      ]);

    const averageRating =
      avgRatingData[0]?.avgRating || 0;

    res.json({
      success: true,
      stats: {
        totalTutors,
        totalApprovedTutors,
        totalBookings,
        totalReviews,
        averageRating: Number(
          averageRating.toFixed(1)
        ),
      },
    });
  } catch (err) {
    console.error("통계 조회 오류:", err);

    res.status(500).json({
      success: false,
      message: "통계 조회 중 서버 오류",
    });
  }
});

// ===================================================
// 🧩 토큰 검증 (자동 로그인용)
// ===================================================
router.get("/verify-token", (req, res) => {
  res.json({
    success: true,
    message: "유효한 관리자 토큰입니다.",
  });
});

// ===================================================
// 🚀 라우터 내보내기
// ===================================================
module.exports = router;