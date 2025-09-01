const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
// 인증 미들웨어 필요 시 아래 주석 해제 후 사용
// const { authenticateToken } = require("../middleware/auth");
const sendNotification = require("../utils/sendNotification"); // 알림 함수 임포트

// ======================
// 예약 목록 조회
// studentId, tutorId 필터 가능
// ======================
router.get("/", /*authenticateToken,*/ async (req, res) => {
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

// ======================
// 예약 삭제 (취소)
// ======================
router.delete("/:id", /*authenticateToken,*/ async (req, res) => {
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

// ======================
// 예약 생성
// ======================
router.post("/", /*authenticateToken,*/ async (req, res) => {
  const { student, tutor, date, time, notes } = req.body;

  if (!student || !tutor || !date || !time) {
    return res.status(400).json({ detail: "필수 정보를 모두 입력해 주세요." });
  }

  try {
    // 예약 시간 중복 체크 (같은 튜터)
    const existing = await Booking.findOne({ tutor, date, time });
    if (existing) {
      return res.status(409).json({ detail: "이미 해당 시간에 예약이 존재합니다." });
    }

    // 동일 학생, 튜터, 날짜 및 시간 중복 체크 (중복 예약 방지)
    const duplicate = await Booking.findOne({ student, tutor, date, time });
    if (duplicate) {
      return res.status(409).json({ detail: "이미 동일한 수업이 예약되어 있습니다." });
    }

    const booking = new Booking({ student, tutor, date, time, notes });
    await booking.save();

    // 예약 성공 시 튜터에게 알림 전송
    await sendNotification({
      recipientId: tutor,
      message: `새 예약이 들어왔습니다: ${date} ${time}`,
      type: "booking",
      link: `/tutor/bookings/${booking._id}`, // 프론트에서 이 링크로 상세 페이지 이동 가능
    });

    res.status(201).json({ message: "예약이 완료되었습니다.", booking });
  } catch (err) {
    console.error("예약 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;