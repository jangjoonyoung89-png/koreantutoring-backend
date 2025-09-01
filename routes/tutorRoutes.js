const express = require("express");
const router = express.Router();
const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const authMiddleware = require("../middleware/auth");

// ✅ 더미 튜터 등록 API (중복 방지)
router.post("/dummy", async (req, res) => {
  try {
    const count = await Tutor.countDocuments();
    if (count > 0) {
      return res.status(400).json({ error: "이미 더미 데이터가 존재합니다." });
    }

    const dummyTutors = [
      {
        name: "홍길동",
        email: "hong@test.com",
        bio: "10년 경력의 한국어 전문 튜터입니다.",
        languages: ["한국어", "영어"],
        price: 25000,
        availableTimes: [
          { day: "월요일", slots: ["10:00", "12:00"] },
          { day: "수요일", slots: ["14:00", "16:00"] },
        ],
      },
      {
        name: "김영희",
        email: "kim@test.com",
        bio: "초보자에게 맞춘 수업을 제공합니다.",
        languages: ["한국어", "일본어"],
        price: 20000,
        availableTimes: [
          { day: "화요일", slots: ["13:00", "15:00"] },
          { day: "금요일", slots: ["09:00", "11:00"] },
        ],
      },
    ];

    await Tutor.insertMany(dummyTutors);
    res.status(201).json({ message: "더미 튜터 등록 완료" });
  } catch (err) {
    console.error("더미 튜터 추가 오류:", err);
    res.status(500).json({ error: "더미 추가 실패" });
  }
});

// ✅ 전체 튜터 조회 + 평균 평점 포함
router.get("/with-rating", async (req, res) => {
  try {
    const tutors = await Tutor.find().lean();

    const tutorsWithRating = await Promise.all(
      tutors.map(async (tutor) => {
        const reviews = await Review.find({ tutor: tutor._id });
        const avgRating = reviews.length
          ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
          : 0;
        return { ...tutor, averageRating: Number(avgRating.toFixed(1)) };
      })
    );

    res.json(tutorsWithRating);
  } catch (err) {
    console.error("튜터 목록 조회 오류:", err);
    res.status(500).json({ error: "튜터 목록 불러오기 실패" });
  }
});

// ✅ 전체 튜터 조회 (평점 없음)
router.get("/", async (req, res) => {
  try {
    const tutors = await Tutor.find();
    res.json(tutors);
  } catch (err) {
    res.status(500).json({ error: "튜터 목록 불러오기 실패" });
  }
});

// ✅ 특정 튜터 조회
router.get("/:id", async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });
    res.json(tutor);
  } catch (err) {
    console.error("특정 튜터 조회 오류:", err);
    res.status(400).json({ error: "유효하지 않은 튜터 ID입니다." });
  }
});

// ✅ 튜터 등록
router.post("/", async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: "이름(name)은 필수 항목입니다." });
    }
    const newTutor = new Tutor(req.body);
    const savedTutor = await newTutor.save();
    res.status(201).json(savedTutor);
  } catch (err) {
    console.error("튜터 등록 오류:", err);
    res.status(400).json({ error: "튜터 등록 실패" });
  }
});

// ✅ 튜터 정보 수정 (본인 권한 체크)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });

    // 예: tutor.userId 필드로 본인 확인
    if (tutor.userId?.toString() !== req.user.id) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    Object.assign(tutor, req.body);
    const updatedTutor = await tutor.save();

    res.json(updatedTutor);
  } catch (err) {
    console.error("튜터 수정 오류:", err);
    res.status(400).json({ error: "튜터 수정 실패" });
  }
});

// ✅ 튜터 삭제 (본인 권한 체크)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });

    if (tutor.userId?.toString() !== req.user.id) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    await tutor.deleteOne();
    res.json({ message: "튜터 삭제 완료" });
  } catch (err) {
    console.error("튜터 삭제 오류:", err);
    res.status(500).json({ error: "튜터 삭제 실패" });
  }
});

module.exports = router;