const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");


router.get("/", async (req, res) => {
  const { studentId, tutorId } = req.query;
  const filter = {};
  if (studentId) filter.student = studentId;
  if (tutorId) filter.tutor = tutorId;

  try {
    const bookings = await Booking.find(filter)
      .populate("tutor", "full_name email")
      .populate("student", "full_name email")
      .sort({ date: 1, time: 1 });

    res.json(bookings);
  } catch (err) {
    console.error("예약 목록 조회 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});


router.delete("/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ detail: "예약을 찾을 수 없습니다." });
    }
    res.json({ message: "예약이 취소되었습니다." });
  } catch (err) {
    console.error("예약 취소 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});


router.post("/", async (req, res) => {
  const { student, tutor, date, time, notes } = req.body;

  if (!student || !tutor || !date || !time) {
    return res.status(400).json({ detail: "필수 정보를 모두 입력해 주세요." });
  }

  try {
    
    const existing = await Booking.findOne({ tutor, date, time });
    if (existing) {
      return res.status(409).json({ detail: "이미 해당 시간에 예약이 존재합니다." });
    }

    
    const duplicate = await Booking.findOne({ student, tutor, date, time });
    if (duplicate) {
      return res.status(409).json({ detail: "이미 동일한 수업이 예약되어 있습니다." });
    }

    const booking = new Booking({ student, tutor, date, time, notes });
    await booking.save();

    res.status(201).json({ message: "예약이 완료되었습니다.", booking });
  } catch (err) {
    console.error("예약 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;