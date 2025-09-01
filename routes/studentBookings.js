const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const requireAuth = require("../middleware/requireAuth"); // JWT 등 인증 미들웨어

// ======================
// 학생 본인 예약 내역 조회
// ======================
router.get("/", requireAuth, async (req, res) => {
  try {
    const studentId = req.user.id; // 로그인한 사용자 ID 사용
    const bookings = await Booking.find({ student: studentId })
      .populate("tutor", "name email sampleVideoUrl") // 튜터 정보 포함
      .sort({ date: 1, time: 1 });

    res.json(bookings);
  } catch (err) {
    console.error("학생 예약 내역 조회 오류:", err);
    res.status(500).json({ error: "예약 데이터를 불러오는 중 오류가 발생했습니다." });
  }
});

// ======================
// 예약 취소
// ======================
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "예약을 찾을 수 없습니다." });
    }

    // 본인 예약만 삭제 가능
    if (booking.student.toString() !== req.user.id) {
      return res.status(403).json({ message: "본인의 예약만 취소할 수 있습니다." });
    }

    await booking.deleteOne();

    res.json({ message: "예약이 취소되었습니다." });
  } catch (err) {
    console.error("예약 취소 오류:", err);
    res.status(500).json({ message: "서버 오류로 인해 예약 취소에 실패했습니다." });
  }
});

module.exports = router;