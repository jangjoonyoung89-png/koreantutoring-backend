const express = require("express");
const router = express.Router();
const Tutor = require("../models/Tutor");
const authMiddleware = require("../middleware/auth");

// ✅ 더미 튜터 등록 API
router.post("/dummy", async (req, res) => {
  try {
    const dummyTutors = [
      {
        name: "홍길동",
        email: "hong@test.com",
        bio: "10년 경력의 한국어 전문 튜터입니다.",
        languages: ["한국어", "영어"],
        hourlyRate: 25000,
        availableTimes: [
          { day: "월요일", start: "10:00", end: "12:00" },
          { day: "수요일", start: "14:00", end: "16:00" },
        ],
      },
      {
        name: "김영희",
        email: "kim@test.com",
        bio: "초보자에게 맞춘 수업을 제공합니다.",
        languages: ["한국어", "일본어"],
        hourlyRate: 20000,
        availableTimes: [
          { day: "화요일", start: "13:00", end: "15:00" },
          { day: "금요일", start: "09:00", end: "11:00" },
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

// ✅ 전체 튜터 조회
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
    res.status(500).json({ error: "튜터 정보 불러오기 실패" });
  }
});

// ✅ 튜터 등록 (회원가입 등에서 사용)
router.post("/", async (req, res) => {
  try {
    const newTutor = new Tutor(req.body);
    const savedTutor = await newTutor.save();
    res.status(201).json(savedTutor);
  } catch (err) {
    res.status(400).json({ error: "튜터 등록 실패" });
  }
});

// ✅ 튜터 정보 수정
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const updatedTutor = await Tutor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedTutor) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });
    res.json(updatedTutor);
  } catch (err) {
    res.status(400).json({ error: "튜터 수정 실패" });
  }
});

// ✅ 튜터 삭제
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Tutor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });
    res.json({ message: "튜터 삭제 완료" });
  } catch (err) {
    res.status(500).json({ error: "튜터 삭제 실패" });
  }
});

module.exports = router;