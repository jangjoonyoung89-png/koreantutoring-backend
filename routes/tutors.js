const express = require("express");
const router = express.Router();
const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/videos");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `tutor_${req.body.tutorId}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// 고정 경로 우선 정의
router.get("/with-rating", async (req, res) => {
  try {
    const tutors = await Tutor.find();

    const results = await Promise.all(
      tutors.map(async (tutor) => {
        const reviews = await Review.find({ tutor: tutor._id });
        const count = reviews.length;
        const average =
          count > 0
            ? (reviews.reduce((acc, cur) => acc + cur.rating, 0) / count).toFixed(1)
            : null;
        return {
          ...tutor._doc,
          averageRating: average,
          reviewCount: count,
        };
      })
    );

    res.json(results);
  } catch (err) {
    console.error("with-rating 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

router.get("/tutor/:tutorId/average", async (req, res) => {
  const { tutorId } = req.params;

  try {
    const reviews = await Review.find({ tutor: tutorId });
    if (reviews.length === 0) {
      return res.json({ average: 0, count: 0 });
    }

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const average = total / reviews.length;

    res.json({ average: average.toFixed(1), count: reviews.length });
  } catch (err) {
    console.error("평균 평점 계산 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 비디오 업로드 라우터
router.post("/:id/upload-video", upload.single("video"), async (req, res) => {
  const { tutorId } = req.body;
  if (!req.file) return res.status(400).json({ error: "파일 없음" });

  try {
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ error: "튜터 없음" });

    tutor.sampleVideoUrl = `/uploads/videos/${req.file.filename}`;
    await tutor.save();

    res.json({ success: true, sampleVideoUrl: tutor.sampleVideoUrl });
  } catch (err) {
    console.error("비디오 업로드 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 튜터 목록 조회 (/:id 경로보다 위에 위치)
router.get("/", async (req, res) => {
  try {
    console.log("튜터 목록 요청 들어옴");
    const tutors = await Tutor.find();
    console.log("튜터 수:", tutors.length);
    res.json(tutors);
  } catch (err) {
    console.error("튜터 불러오기 실패:", err);
    res.status(500).json({ detail: "튜터 불러오기 실패" });
  }
});

// 튜터 상세 조회
router.get("/:id", async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ detail: "튜터를 찾을 수 없습니다." });
    res.json(tutor);
  } catch (err) {
    console.error("튜터 조회 에러:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 튜터 가능 시간 수정
router.patch("/:id/availability", async (req, res) => {
  const { id } = req.params;
  const { availableTimes } = req.body;

  try {
    const updated = await Tutor.findByIdAndUpdate(id, { availableTimes }, { new: true });
    if (!updated) return res.status(404).json({ detail: "튜터를 찾을 수 없습니다." });
    res.json({ message: "업데이트 성공", tutor: updated });
  } catch (err) {
    console.error("튜터 가능시간 업데이트 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// 튜터 가능 시간 조회
router.get("/:id/availability", async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ detail: "튜터 없음" });
    res.json({ availableTimes: tutor.availableTimes });
  } catch (err) {
    console.error("튜터 시간 조회 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

router.post("/", async (req, res) => {
  try {
    const newTutor = new Tutor(req.body);
    await newTutor.save();
    res.status(201).json(newTutor);
  } catch (err) {
    console.error("튜터 생성 실패:", err);
    res.status(500).json({ message: "튜터 생성 실패" });
  }
});

module.exports = router;