const mongoose = require("mongoose");

// ======================
// 수업 자료 스키마 정의
// ======================
const MaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },         // 자료 제목
    filePath: { type: String, required: true },      // 업로드 파일 경로
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true }, // 어떤 수업 예약에 대한 자료인지
    uploadedAt: { type: Date, default: Date.now },   // 업로드 시간
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },  // 업로드한 사용자
  },
  { timestamps: true } // createdAt, updatedAt 자동 생성
);

const Material = mongoose.models.Material || mongoose.model("Material", MaterialSchema);
module.exports = Material;