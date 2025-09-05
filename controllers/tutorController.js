const mongoose = require("mongoose");
const Tutor = require("../models/Tutor");

// ----------------------
// 튜터 소개 영상 업로드
// ----------------------
exports.uploadIntroVideo = async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "업로드된 파일이 없습니다." });
    }

    // 환경 변수 기반 API 주소
    const baseUrl = process.env.BASE_URL || "http://localhost:8000";
    const videoUrl = `${baseUrl}/videos/${file.filename}`;

    // sampleVideoUrl 필드에 저장 (스키마 기준)
    const tutor = await Tutor.findByIdAndUpdate(
      tutorId,
      { sampleVideoUrl: videoUrl },
      { new: true }
    );

    if (!tutor) {
      return res.status(404).json({ message: "튜터를 찾을 수 없습니다." });
    }

    res.json({ message: "소개 영상 업로드 성공", videoUrl, tutor });
  } catch (error) {
    console.error("업로드 실패:", error);
    res
      .status(500)
      .json({ message: "소개 영상 업로드 실패", error: error.message });
  }
};

// ----------------------
// 튜터 상세 조회
// ----------------------
exports.getTutorById = async (req, res) => {
  try {
    const { id } = req.params;

    // ObjectId 검증
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "잘못된 ID 형식" });
    }

    const tutor = await Tutor.findById(id);

    if (!tutor) {
      return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });
    }

    res.json(tutor);
  } catch (err) {
    console.error("튜터 조회 오류", err);
    res.status(500).json({ error: "튜터 조회 중 오류", detail: err.message });
  }
};