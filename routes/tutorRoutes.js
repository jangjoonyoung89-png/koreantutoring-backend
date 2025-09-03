const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const authMiddleware = require("../middleware/auth");

// ----------------------
// ObjectId 유효성 검사
// ----------------------
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// ----------------------
// Multer 설정 (비디오 업로드)
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
// 샘플 데이터 (DB 장애 시 fallback)
// ----------------------
const sampleTutors = [
  {
    _id: "66bca24e6f6e3b1f44a9a111",
    name: "홍길동",
    email: "hong@test.com",
    experience: 10,
    bio: "10년 경력의 한국어 전문 튜터입니다.",
    img: "https://randomuser.me/api/portraits/lego/1.jpg",
    approved: true,
    availableTimes: [
      { day: "월요일", slots: ["10:00", "12:00"] },
      { day: "수요일", slots: ["14:00", "16:00"] },
    ],
  },
  {
    _id: "66bca24e6f6e3b1f44a9a222",
    name: "김영희",
    email: "kim@test.com",
    experience: 5,
    bio: "초보자에게 맞춘 수업을 제공합니다.",
    img: "https://randomuser.me/api/portraits/lego/2.jpg",
    approved: true,
    availableTimes: [
      { day: "화요일", slots: ["13:00", "15:00"] },
      { day: "금요일", slots: ["09:00", "11:00"] },
    ],
  },
  {
    _id: "66bca24e6f6e3b1f44a9a333",
    name: "박철수",
    email: "park@test.com",
    experience: 7,
    bio: "맞춤형 한국어 수업 제공",
    img: "https://randomuser.me/api/portraits/lego/3.jpg",
    approved: true,
    availableTimes: [
      { day: "수요일", slots: ["10:00", "12:00"] },
      { day: "목요일", slots: ["14:00", "16:00"] },
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
      return res.status(400).json({ error: "이미 더미 데이터가 존재합니다." });

    await Tutor.insertMany(sampleTutors);
    res.status(201).json({ message: "더미 튜터 등록 완료" });
  } catch (err) {
    console.error("더미 튜터 추가 오류:", err);
    res.status(500).json({ error: "더미 추가 실패" });
  }
});

// ----------------------
// 전체 튜터 조회 (평점 포함)
// ----------------------
router.get("/with-rating", async (req, res) => {
  try {
    let tutors = await Tutor.find({ approved: true }).lean();
    if (!tutors || tutors.length === 0) tutors = sampleTutors;

    const tutorsWithRating = await Promise.all(
      tutors.map(async (tutor) => {
        const reviews = await Review.find({ tutor: tutor._id });
        const avgRating = reviews.length
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          : null;
        return { ...tutor, averageRating: avgRating ? Number(avgRating.toFixed(1)) : null };
      })
    );

    res.json(tutorsWithRating);
  } catch (err) {
    console.error("튜터 목록 조회 오류:", err);
    res.status(500).json(sampleTutors);
  }
});

// ----------------------
// 전체 튜터 조회 (평점 없음)
// ----------------------
router.get("/", async (req, res) => {
  try {
    const tutors = await Tutor.find();
    res.json(tutors.length > 0 ? tutors : sampleTutors);
  } catch (err) {
    console.error("튜터 목록 불러오기 실패:", err);
    res.status(500).json(sampleTutors);
  }
});

// ----------------------
// 특정 튜터 조회
// ----------------------
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: "유효하지 않은 튜터 ID입니다." });

  try {
    let tutor = await Tutor.findById(id).lean();
    if (!tutor) throw new Error("튜터 없음");

    const reviews = await Review.find({ tutor: id });
    const averageRating =
      reviews.length > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : null;

    res.json({ ...tutor, averageRating });
  } catch (err) {
    console.warn("튜터 조회 실패 → 샘플 데이터 fallback");
    const sampleTutor = sampleTutors.find((t) => t._id === id);
    if (sampleTutor) return res.json({ ...sampleTutor, averageRating: null });
    res.status(404).json({ error: "튜터를 찾을 수 없습니다." });
  }
});

// ----------------------
// 튜터 생성
// ----------------------
router.post("/", async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: "이름은 필수입니다." });
    const newTutor = new Tutor(req.body);
    await newTutor.save();
    res.status(201).json(newTutor);
  } catch (err) {
    console.error("튜터 생성 실패:", err);
    res.status(500).json({ error: "튜터 생성 실패" });
  }
});

// ----------------------
// 튜터 수정 (권한 체크)
// ----------------------
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });

    if (tutor.userId?.toString() !== req.user.id)
      return res.status(403).json({ error: "권한이 없습니다." });

    Object.assign(tutor, req.body);
    const updatedTutor = await tutor.save();
    res.json(updatedTutor);
  } catch (err) {
    console.error("튜터 수정 실패:", err);
    res.status(400).json({ error: "튜터 수정 실패" });
  }
});

// ----------------------
// 튜터 삭제 (권한 체크)
// ----------------------
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });

    if (tutor.userId?.toString() !== req.user.id)
      return res.status(403).json({ error: "권한이 없습니다." });

    await tutor.deleteOne();
    res.json({ message: "튜터 삭제 완료" });
  } catch (err) {
    console.error("튜터 삭제 실패:", err);
    res.status(500).json({ error: "튜터 삭제 실패" });
  }
});

// ----------------------
// 튜터 가능 시간 조회/수정
// ----------------------
router.get("/:id/availability", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: "유효하지 않은 튜터 ID입니다." });

  try {
    const tutor = await Tutor.findById(id);
    if (!tutor) throw new Error("튜터 없음");
    res.json({ availableTimes: tutor.availableTimes });
  } catch (err) {
    console.warn("가능 시간 조회 실패 → 샘플 fallback");
    const sampleTutor = sampleTutors.find((t) => t._id === id);
    if (sampleTutor) return res.json({ availableTimes: sampleTutor.availableTimes });
    res.status(500).json({ error: "서버 오류" });
  }
});

router.patch("/:id/availability", async (req, res) => {
  const { id } = req.params;
  const { availableTimes } = req.body;
  if (!isValidObjectId(id)) return res.status(400).json({ error: "유효하지 않은 튜터 ID입니다." });

  try {
    const updated = await Tutor.findByIdAndUpdate(id, { availableTimes }, { new: true });
    if (!updated) throw new Error("튜터 없음");
    res.json({ message: "가능 시간 업데이트 성공", tutor: updated });
  } catch (err) {
    console.error("튜터 가능 시간 업데이트 실패:", err);
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
    console.error("예약 생성 실패:", err);
    res.status(500).json({ error: "예약 실패" });
  }
});

// ----------------------
// 예약 달력/시간 (더미)
// ----------------------
router.get("/:id/available-dates", (req, res) => {
  res.json(["2025-08-16", "2025-08-17", "2025-08-18"]);
});

router.get("/:id/available-times", (req, res) => {
  res.json(["10:00", "11:00", "14:00", "16:00"]);
});

// ----------------------
// 비디오 업로드
// ----------------------
router.post("/:id/upload-video", upload.single("video"), async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ error: "유효하지 않은 튜터 ID입니다." });
  if (!req.file) return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });

  try {
    const tutor = await Tutor.findById(id);
    if (!tutor) throw new Error("튜터 없음");

    tutor.sampleVideoUrl = `/uploads/videos/${req.file.filename}`;
    await tutor.save();
    res.json({ success: true, sampleVideoUrl: tutor.sampleVideoUrl });
  } catch (err) {
    console.error("비디오 업로드 실패:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// ----------------------
// 수업 시작 가능 여부 확인
// ----------------------
router.post("/check-start-time", async (req, res) => {
  const { bookingId } = req.body;
  if (!isValidObjectId(bookingId)) return res.status(400).json({ error: "유효하지 않은 예약 ID입니다." });

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "예약 정보 없음" });

    const canStart = new Date() >= new Date(booking.startTime);
    res.json({ canStart });
  } catch (err) {
    console.error("수업 시작 시간 확인 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

module.exports = router;