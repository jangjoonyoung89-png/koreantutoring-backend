const express = require("express");
const axios = require("axios");
const router = express.Router();

const CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const REDIRECT_URI = "https://www.koreantutoring.co.kr/api/zoom/callback";

// 1️⃣ OAuth 인증 시작
router.get("/auth", (req, res) => {
  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

// 2️⃣ 인증 완료 후 콜백 처리
router.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const response = await axios.post(
      "https://zoom.us/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
        },
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
        },
      }
    );

    const accessToken = response.data.access_token;
    // 👉 tutor의 DB에 access_token 저장
    res.send("Zoom 계정 연결 성공!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Zoom 인증 실패");
  }
});

// 3️⃣ 회의 생성 API
router.post("/create-meeting", async (req, res) => {
  const { topic, start_time, duration, tutorZoomToken } = req.body;

  try {
    const response = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        topic,
        type: 2,
        start_time,
        duration,
      },
      {
        headers: {
          Authorization: `Bearer ${tutorZoomToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      join_url: response.data.join_url,
      start_url: response.data.start_url,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Zoom 회의 생성 실패");
  }
});

module.exports = router;