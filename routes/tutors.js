const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const Booking = require("../models/Booking");

// ----------------------
// ObjectId 유효성 검사
// ----------------------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ----------------------
// 동영상 업로드 설정
// ----------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/videos"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `tutor_${req.params.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ----------------------
// 샘플 튜터 데이터
// ----------------------
const sampleTutors = [
  {
    _id: "687eeafbea619374de3ce87a",
    name: "김영희",
    email: "kim@example.com",
    bio: "친절하게 한국어를 가르치는 튜터입니다.",
    price: 20000,
    photo: "https://example.com/photos/kim.jpg",
    sampleVideoUrl: "https://example.com/videos/kim.mp4",
    approved: true,
    availableTimes: [
      { day: "Monday", slots: ["10:00", "12:00"] },
      { day: "Wednesday", slots: ["14:00", "16:00"] },
    ],
  },
  {
    _id: "tutor2",
    name: "홍길동",
    email: "hong@test.com",
    bio: "10년 경력의 한국어 전문 튜터입니다.",
    price: 25000,
    photo: "https://randomuser.me/api/portraits/lego/1.jpg",
    sampleVideoUrl: null,
    approved: true,
    availableTimes: [
      { day: "Tuesday", slots: ["13:00", "15:00"] },
      { day: "Friday", slots: ["09:00", "11:00"] },
    ],
  },
];

// ----------------------
// 더미 튜터 등록
// ----------------------
router.post("/dummy", async (req, res) => {
  try {
    const count = await Tutor.countDocuments();
    if (count > 0)
      return res.status(400).json({ error: "더미 데이터가 이미 존재합니다." });

    await Tutor.insertMany(sampleTutors);
    res.status(201).json({ message: "더미 튜터 등록 완료" });
  } catch (err) {
    console.error("❌ 더미 추가 실패:", err);
    res.status(500).json({ error: "더미 추가 실패" });
  }
});

// ----------------------
// 전체 튜터 조회
// ----------------------
router.get("/", async (req, res) => {
  try {
    let tutors = [];

    try {
      tutors = await Tutor.find({ approved: true }).lean();
      console.log("✅ DB에서 가져온 tutors:", tutors);
    } catch (err) {
      console.error("❌ DB 조회 실패:", err);
      tutors = sampleTutors;
    }

    // 리뷰 평균값 추가
    tutors = await Promise.all(
      tutors.map(async (tutor) => {
        try {
          const reviews = await Review.find({ tutor: tutor._id });
          const averageRating =
            reviews.length > 0
              ? Number(
                  (
                    reviews.reduce((sum, r) => sum + r.rating, 0) /
                    reviews.length
                  ).toFixed(1)
                )
              : null;
          return { ...tutor, averageRating };
        } catch (err) {
          console.error("❌ 리뷰 조회 실패:", err);
          return { ...tutor, averageRating: null };
        }
      })
    );

    res.json(tutors);
  } catch (err) {
    console.error("❌ 튜터 조회 전체 실패:", err);
    res.json(sampleTutors);
  }
});

// ----------------------
// 튜터 상세 조회
// ----------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    let tutor = null;
    if (isValidObjectId(id)) tutor = await Tutor.findById(id).lean();

    if (!tutor) throw new Error("튜터 없음");

    const reviews = await Review.find({ tutor: id });
    const averageRating =
      reviews.length > 0
        ? Number(
            (
              reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            ).toFixed(1)
          )
        : null;

    res.json({ ...tutor, averageRating });
  } catch (err) {
    console.error("❌ 튜터 상세 조회 실패:", err.message);
    const sampleTutor = sampleTutors.find((t) => t._id === id);
    if (sampleTutor) return res.json({ ...sampleTutor, averageRating: null });
    res.status(404).json({ error: "튜터를 찾을 수 없습니다." });
  }
});

// ----------------------
// 튜터 가능 시간 조회
// ----------------------
router.get("/:id/availability", async (req, res) => {
  const { id } = req.params;
  try {
    let tutor = null;
    if (isValidObjectId(id)) tutor = await Tutor.findById(id);
    if (!tutor) throw new Error("튜터 없음");
    res.json({ availableTimes: tutor.availableTimes });
  } catch (err) {
    console.error("❌ 튜터 가능 시간 조회 실패:", err.message);
    const sampleTutor = sampleTutors.find((t) => t._id === id);
    if (sampleTutor) return res.json({ availableTimes: sampleTutor.availableTimes });
    res.status(500).json({ error: "서버 오류" });
  }
});

// ----------------------
// 튜터 가능 시간 업데이트
// ----------------------
router.patch("/:id/availability", async (req, res) => {
  const { id } = req.params;
  const { availableTimes } = req.body;
  try {
    const updated = await Tutor.findByIdAndUpdate(
      id,
      { availableTimes },
      { new: true }
    );
    if (!updated) throw new Error("튜터 없음");
    res.json({ message: "가능 시간 업데이트 성공", tutor: updated });
  } catch (err) {
    console.error("❌ 가능 시간 업데이트 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// ----------------------
// 예약 생성
// ----------------------
router.post("/bookings", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();
    res.json({ message: "예약 완료", booking });
  } catch (err) {
    console.error("❌ 예약 실패:", err);
    res.status(500).json({ error: "예약 실패" });
  }
});

// ----------------------
// 동영상 업로드
// ----------------------
router.post("/:id/upload-video", upload.single("video"), async (req, res) => {
  const { id } = req.params;
  if (!req.file)
    return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });

  try {
    const tutor = await Tutor.findById(id);
    if (!tutor) throw new Error("튜터 없음");

    tutor.sampleVideoUrl = `/uploads/videos/${req.file.filename}`;
    await tutor.save();
    res.json({ success: true, sampleVideoUrl: tutor.sampleVideoUrl });
  } catch (err) {
    console.error("❌ 동영상 업로드 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

module.exports = router;