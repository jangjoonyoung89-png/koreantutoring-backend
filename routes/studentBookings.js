const express = require("express");
const router = express.Router();
const requireAuth = require("../middleware/requireAuth");
const Booking = require("../models/Booking");

router.get("/my-bookings", requireAuth, async (req, res) => {
  try {
    const studentId = req.user._id;
    const bookings = await Booking.find({ student: studentId })
      .populate("tutor", "full_name")
      .sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch (err) {
    console.error("학생 예약 내역 조회 오류:", err);
    res.status(500).json({ error: "예약 데이터를 불러오는 중 오류가 발생했습니다." });
  }
});

router.get("/", requireAuth, async (req, res) => {
  const studentId = req.user.userId;

  try {
    const bookings = await Booking.find({ student: studentId })
      .populate("tutor", "full_name email")
      .sort({ date: 1, time: 1 });

    res.json(bookings);
  } catch (err) {
    console.error("학생 예약 조회 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: '예약을 찾을 수 없습니다.' });
    }

    
    if (booking.student.toString() !== req.user.id) {
      return res.status(403).json({ message: '본인의 예약만 취소할 수 있습니다.' });
    }

    await booking.deleteOne();

    res.json({ message: '예약이 취소되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류로 인해 취소에 실패했습니다.' });
  }
});

module.exports = router;