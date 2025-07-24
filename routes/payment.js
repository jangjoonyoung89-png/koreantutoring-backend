const express = require("express");
const axios = require("axios");
const router = express.Router();
const paymentController = require("../controllers/paymentController");


const payments = []; 


function mockAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "인증이 필요합니다." });
  }
  req.user = { id: 101 }; 
  next();
}


router.post("/", paymentController.createPayment);

router.get("/", paymentController.getPaymentsByStudent);

router.post("/approve", mockAuth, async (req, res) => {
  const { paymentId, pg_token } = req.body;

  if (!paymentId || !pg_token) {
    return res.status(400).json({ detail: "paymentId와 pg_token이 필요합니다." });
  }

  
  const payment = payments.find((p) => p.id === paymentId && p.userId === req.user.id);
  if (!payment) {
    return res.status(404).json({ detail: "결제 정보를 찾을 수 없습니다." });
  }

  try {
    const kakaoRes = await axios.post(
      "https://kapi.kakao.com/v1/payment/approve",
      new URLSearchParams({
        cid: "TC0ONETIME", 
        tid: payment.tid, 
        partner_order_id: "order_001", 
        partner_user_id: `user_${req.user.id}`, 
        pg_token: pg_token,
      }),
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    
    payment.approved = true;
    payment.approval_data = kakaoRes.data;

    res.json({ message: "결제 승인 완료", approval: kakaoRes.data });
  } catch (error) {
    console.error("카카오페이 승인 실패", error?.response?.data || error.message);
    res.status(500).json({ detail: "카카오페이 승인 실패" });
  }
});

module.exports = router;