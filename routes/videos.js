const express = require("express");
const router = express.Router();
const Tutor = require("../models/Tutor");
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/videos/"); 
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${file.fieldname}${ext}`);
  },
});
const upload = multer({ storage: storage });


router.post("/:id/upload-video", upload.single("video"), async (req, res) => {
  try {
    const tutorId = req.params.id;
    const videoPath = req.file ? `/uploads/videos/${req.file.filename}` : null;
    if (!videoPath) {
      return res.status(400).json({ detail: "비디오 파일이 필요합니다." });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({ detail: "튜터를 찾을 수 없습니다." });
    }

    tutor.sampleVideoUrl = videoPath; 
    await tutor.save();

    res.json({ message: "샘플 영상 업로드 성공", videoUrl: videoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;