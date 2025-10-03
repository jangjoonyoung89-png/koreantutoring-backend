const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true }, // 사용자 이름
    email: { type: String, required: true, unique: true }, // 이메일 (고유값)
    password: { type: String, required: true }, // 비밀번호 (bcrypt로 해시됨)

    // 사용자 역할: 기본값은 "student"
    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student", // ✅ 기본값 추가
      required: true,
    },

    tutorVerified: { type: Boolean, default: false }, // 튜터 인증 여부

    // 비밀번호 재설정을 위한 토큰
    resetToken: String,
    resetTokenExpire: Date,
  },
  { timestamps: true } // 생성일/수정일 자동 기록
);

// 🔐 비밀번호 해시 처리 미들웨어
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔑 비밀번호 비교 메서드
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
