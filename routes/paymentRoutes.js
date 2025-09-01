import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../api"; // baseURL 설정된 axios 인스턴스

export default function PaymentSuccess() {
  const location = useLocation();
  const pgToken = new URLSearchParams(location.search).get("pg_token");

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const token = localStorage.getItem("token"); // 로그인 토큰
        const paymentId = localStorage.getItem("paymentId"); // 결제 전 저장한 ID

        if (!paymentId || !token) {
          alert("필수 정보가 누락되었습니다.");
          return;
        }

        const response = await api.post(
          "/api/payments/approve",
          {
            pg_token: pgToken,
            paymentId: paymentId,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        alert("결제 성공: " + response.data.message);

        // 성공 후 paymentId 제거
        localStorage.removeItem("paymentId");
      } catch (err) {
        console.error("결제 승인 실패:", err?.response?.data || err.message);
        alert("결제 승인 실패");
      }
    };

    if (pgToken) {
      confirmPayment();
    }
  }, [pgToken]);

  return <h2>결제 처리 중입니다...</h2>;
}