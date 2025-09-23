const express = require("express");
const router = express.Router();
const Tutor = require("../models/Tutor");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 업로드 폴더 자동 생성
const uploadDir = "uploads/videos";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}_${file.fieldname}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  const ext = path.extname(file.originalname).toLowerCase();
  allowed.includes(ext) ? cb(null, true) : cb(new Error("비디오 파일만 업로드 가능합니다."), false);
};

const upload = multer({ storage, fileFilter });

// 단일 영상 업로드
router.post("/:id/upload-video", upload.single("video"), async (req, res) => {
  try {
    const tutorId = req.params.id;
    if (!req.file) return res.status(400).json({ detail: "비디오 파일이 필요합니다." });

    const videoPath = `/videos/${req.file.filename}`;
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ detail: "튜터를 찾을 수 없습니다." });

    // 배열 형태로 여러 영상 저장 가능
    if (!tutor.sampleVideos) tutor.sampleVideos = [];
    tutor.sampleVideos.push(videoPath);
    await tutor.save();

    res.json({ message: "샘플 영상 업로드 성공", videoUrl: videoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 영상 목록 조회
router.get("/:id/videos", async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ detail: "튜터를 찾을 수 없습니다." });
    res.json({ videos: tutor.sampleVideos || [] });
  } catch (err) {
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;