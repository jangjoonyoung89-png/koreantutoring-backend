const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");


const ALL_TIMES = [
  "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

router.get("/:tutorId/:date", async (req, res) => {
  const { tutorId, date } = req.params;

  try {
    const bookings = await Booking.find({ tutor: tutorId, date });
    const reservedTimes = bookings.map((b) => b.time);
    const availableTimes = ALL_TIMES.filter((t) => !reservedTimes.includes(t));
    res.json({ availableTimes });
  } catch (err) {
    console.error("시간 조회 실패:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;