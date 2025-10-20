const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// ---------------------------
// 🧩 User Schema 정의
// ---------------------------
const userSchema = new mongoose.Schema(
  {
    // 사용자 이름
    full_name: {
      type: String,
      required: [true, "이름은 필수 항목입니다."],
      trim: true,
    },

    // 이메일 (고유값)
    email: {
      type: String,
      required: [true, "이메일은 필수 항목입니다."],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "유효한 이메일 형식이 아닙니다."],
    },

    // 비밀번호 (bcrypt로 해시)
    password: {
      type: String,
      required: [true, "비밀번호는 필수 항목입니다."],
      minlength: [6, "비밀번호는 최소 6자 이상이어야 합니다."],
    },

    // 사용자 역할 (student, tutor, admin)
    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student",
      required: true,
    },

    // 튜터 인증 여부
    tutorVerified: {
      type: Boolean,
      default: false,
    },

    // 비밀번호 재설정 토큰 및 만료 시간
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpire: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // 생성일, 수정일 자동 기록
  }
);

// ---------------------------
// 🔐 비밀번호 해시 미들웨어
// ---------------------------
userSchema.pre("save", async function (next) {
  try {
    // 비밀번호가 수정되지 않았다면 그냥 넘김
    if (!this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10); // 솔트 생성
    this.password = await bcrypt.hash(this.password, salt); // 해시 적용
    next();
  } catch (err) {
    next(err);
  }
});

// ---------------------------
// 🔑 비밀번호 비교 메서드
// ---------------------------
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ---------------------------
// ⚙️ unique 에러(중복 이메일) 핸들링
// ---------------------------
userSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("이미 등록된 이메일입니다."));
  } else {
    next(error);
  }
});

// ---------------------------
// 🚀 모델 내보내기
// ---------------------------
const User = mongoose.model("User", userSchema);
module.exports = User;