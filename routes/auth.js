const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const User = require("../models/User");
const Tutor = require("../models/Tutor");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

// ===================================================
// 환경 변수 설정
// ===================================================
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:3000";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET 환경 변수가 설정되지 않았습니다.");
}

// ===================================================
// JWT 토큰 생성
// ===================================================
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// ===================================================
// 사용자 응답 데이터
// ===================================================
function getUserResponse(user) {
  return {
    id: user._id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    tutorVerified: user.tutorVerified,
  };
}

// ===================================================
// 회원가입
// ===================================================
router.post("/signup", async (req, res) => {
  let session;

  try {
    const { email, password, full_name, role } = req.body;

    // 필수 항목 확인
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        detail: "모든 필드를 입력해 주세요.",
      });
    }

    // 입력 데이터 형식 확인
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof full_name !== "string"
    ) {
      return res.status(400).json({
        detail: "입력 정보가 올바르지 않습니다.",
      });
    }

    // 일반 회원가입은 학습자와 튜터만 허용
    if (!["student", "tutor"].includes(role)) {
      return res.status(400).json({
        detail: "올바른 회원 유형을 선택해 주세요.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = full_name.trim();

    if (!normalizedName) {
      return res.status(400).json({
        detail: "이름을 입력해 주세요.",
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        detail: "유효한 이메일을 입력해 주세요.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        detail: "비밀번호는 8자 이상이어야 합니다.",
      });
    }

    // 이메일 중복 확인
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        detail: "이미 가입된 이메일입니다.",
      });
    }

    let user;

    // =================================================
    // 튜터 회원가입
    // User와 Tutor를 하나의 트랜잭션으로 저장
    // =================================================
    if (role === "tutor") {
      session = await mongoose.startSession();

      await session.withTransaction(async () => {
        user = new User({
          email: normalizedEmail,
          password,
          full_name: normalizedName,
          role: "tutor",
          tutorVerified: false,
        });

        await user.save({ session });

        const tutor = new Tutor({
          userId: user._id,
          name: user.full_name,
          email: user.email,
          bio: "",
          photo: "",
          sampleVideoUrl: "",
          approved: false,
          availableTimes: [],
          averageRating: 0,
          reviewCount: 0,
        });

        await tutor.save({ session });

        console.log(
          "튜터 계정 및 프로필 생성 완료:",
          user.email
        );
      });

      // 트랜잭션 종료
      await session.endSession();
      session = null;
    } else {
      // ===============================================
      // 학습자 회원가입
      // ===============================================
      user = new User({
        email: normalizedEmail,
        password,
        full_name: normalizedName,
        role: "student",
        tutorVerified: false,
      });

      await user.save();

      console.log(
        "학습자 계정 생성 완료:",
        user.email
      );
    }

    // =================================================
    // 회원가입 성공 응답
    // =================================================
    const token = generateToken(user);

    res.status(201).json({
      message:
        role === "tutor"
          ? "튜터 회원가입이 완료되었습니다. 관리자 승인을 기다려 주세요."
          : "회원가입이 완료되었습니다.",
      token,
      user: getUserResponse(user),
    });

    // =================================================
    // 환영 이메일 발송
    // 이메일 실패가 회원가입에 영향을 주지 않도록 처리
    // =================================================
    try {
      const templatePath = path.join(
        __dirname,
        "../templates/welcome.html"
      );

      let htmlContent = "";

      if (fs.existsSync(templatePath)) {
        htmlContent = fs
          .readFileSync(templatePath, "utf-8")
          .replace("{{full_name}}", user.full_name);
      } else {
        htmlContent = `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            color: #17365D;
          ">
            <h1 style="color: #0077CC;">
              ROKMUN
            </h1>

            <p>Your Gateway to Korea</p>

            <hr />

            <h2>ROKMUN 회원가입을 환영합니다!</h2>

            <p>
              대한민국으로 향하는 새로운 여정을
              ROKMUN과 함께 시작하세요.
            </p>

            ${
              role === "tutor"
                ? `
                  <p>
                    튜터 회원가입이 완료되었습니다.
                    관리자 승인 후 튜터 활동을
                    시작하실 수 있습니다.
                  </p>
                `
                : `
                  <p>
                    나에게 맞는 한국어 튜터를 만나
                    새로운 학습을 시작해 보세요.
                  </p>
                `
            }

            <a
              href="${FRONTEND_URL}/login"
              style="
                display: inline-block;
                padding: 12px 24px;
                background: #0077CC;
                color: white;
                text-decoration: none;
                border-radius: 8px;
              "
            >
              ROKMUN 로그인
            </a>

            <p style="margin-top: 30px; color: #777;">
              ROKMUN · Your Gateway to Korea
            </p>
          </div>
        `;
      }

      await sendEmail(
        user.email,
        "ROKMUN 회원가입을 환영합니다!",
        htmlContent
      );
    } catch (emailErr) {
      console.error(
        "환영 이메일 발송 실패:",
        emailErr.message
      );
    }
  } catch (err) {
    console.error("회원가입 오류:", err);

    if (!res.headersSent) {
      if (
        err.code === 11000 ||
        err.message === "이미 등록된 이메일입니다."
      ) {
        return res.status(409).json({
          detail: "이미 가입된 이메일입니다.",
        });
      }

      if (err.name === "ValidationError") {
        return res.status(400).json({
          detail: err.message,
        });
      }

      return res.status(500).json({
        detail: "회원가입 중 서버 오류가 발생했습니다.",
      });
    }
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// ===================================================
// 로그인
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
        detail: "이메일과 비밀번호를 입력해 주세요.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        detail: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({
        detail: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = generateToken(user);

    res.json({
      message: "로그인 성공",
      token,
      user: getUserResponse(user),
    });
  } catch (err) {
    console.error("로그인 오류:", err);

    res.status(500).json({
      detail: "서버 오류가 발생했습니다.",
    });
  }
});

// ===================================================
// 비밀번호 재설정 요청
// ===================================================
router.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        detail: "이메일을 입력해 주세요.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // 보안상 계정 존재 여부를 공개하지 않음
    if (!user) {
      return res.json({
        message:
          "비밀번호 재설정 링크가 이메일로 전송되었습니다.",
      });
    }

    const token = crypto
      .randomBytes(32)
      .toString("hex");

    const expire = Date.now() + 1000 * 60 * 30;

    user.resetToken = token;
    user.resetTokenExpire = expire;

    await user.save();

    const resetLink =
      `${FRONTEND_URL}/reset-password?token=${token}`;

    const templatePath = path.join(
      __dirname,
      "../templates/reset-password.html"
    );

    let htmlContent = "";

    if (fs.existsSync(templatePath)) {
      htmlContent = fs
        .readFileSync(templatePath, "utf-8")
        .replace(
          "{{full_name}}",
          user.full_name || user.email
        )
        .replace("{{resetLink}}", resetLink);
    } else {
      htmlContent = `
        <h2 style="color: #0077CC;">ROKMUN</h2>

        <h3>비밀번호 재설정 안내</h3>

        <p>
          비밀번호를 재설정하려면
          아래 링크를 클릭하세요.
        </p>

        <a href="${resetLink}">
          비밀번호 재설정
        </a>

        <p>이 링크는 30분 후 만료됩니다.</p>
      `;
    }

    await sendEmail(
      user.email,
      "ROKMUN 비밀번호 재설정 안내",
      htmlContent
    );

    res.json({
      message:
        "비밀번호 재설정 링크가 이메일로 전송되었습니다.",
    });
  } catch (err) {
    console.error("비밀번호 재설정 요청 오류:", err);

    res.status(500).json({
      detail: "서버 오류가 발생했습니다.",
    });
  }
});

// ===================================================
// 비밀번호 재설정 완료
// ===================================================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;

    if (
      typeof token !== "string" ||
      typeof password !== "string" ||
      !token
    ) {
      return res.status(400).json({
        detail: "올바른 정보를 입력해 주세요.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        detail: "비밀번호는 8자 이상이어야 합니다.",
      });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpire: {
        $gt: Date.now(),
      },
    });

    if (!user) {
      return res.status(400).json({
        detail: "유효하지 않거나 만료된 토큰입니다.",
      });
    }

    // User 모델의 pre("save")에서 자동 해시
    user.password = password;
    user.resetToken = null;
    user.resetTokenExpire = null;

    await user.save();

    console.log(
      "비밀번호 변경 완료:",
      user.email
    );

    res.json({
      message: "비밀번호가 성공적으로 변경되었습니다.",
    });
  } catch (err) {
    console.error("비밀번호 재설정 오류:", err);

    res.status(500).json({
      detail: "서버 오류가 발생했습니다.",
    });
  }
});

module.exports = router;