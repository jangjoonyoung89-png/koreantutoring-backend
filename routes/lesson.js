const express = require("express");
const router = express.Router();
const axios = require("axios");
const jwt = require("jsonwebtoken");

const JWT_KEY = process.env.ZOOM_JWT_KEY;
const JWT_SECRET = process.env.ZOOM_JWT_SECRET;

// -------------------
// Zoom JWT 생성
// -------------------
function generateZoomToken() {
  return jwt.sign(
    {
      iss: JWT_KEY,
      exp: Math.floor(Date.now() / 1000) + 60 * 5,
    },
    JWT_SECRET
  );
}

// -------------------
// 수업 예약 API
// -------------------
router.post("/schedule", async (req, res) => {
  const { topic, startTime, duration } = req.body;

  try {
    const token = generateZoomToken();

    const response = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        topic,
        type: 2,
        start_time: startTime,
        duration,
        timezone: "Asia/Seoul",
        settings: {
          host_video: true,
          participant_video: true,
          join_before_host: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      message: "수업 예약 성공",
      join_url: response.data.join_url,
      start_url: response.data.start_url, // 튜터용
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ detail: "Zoom 회의 생성 실패" });
  }
});

module.exports = router;