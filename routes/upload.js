const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 업로드 디렉토리
const uploadDir = "uploads/photos";

// 디렉토리가 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer storage 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// 필터: 이미지 파일만 허용
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimeTypeOk = allowedTypes.test(file.mimetype);
    const extNameOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimeTypeOk && extNameOk) {
      cb(null, true);
    } else {
      cb(new Error("지원하지 않는 파일 형식입니다."));
    }
  },
});

// 프로필 사진 업로드 API
router.post("/upload-profile", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: "파일이 업로드되지 않았습니다." });
  }

  res.status(201).json({
    imageUrl: `/uploads/photos/${req.file.filename}`,
  });
});

module.exports = router;