import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";

export default function PaymentSuccess() {
  const location = useLocation();
  const pgToken = new URLSearchParams(location.search).get("pg_token");

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/payments/success", {
          headers: {
            Authorization: `Bearer ${yourAccessToken}`,
          },
          params: { pg_token: pgToken },
        });
        alert("결제 성공: " + response.data.message);
      } catch (err) {
        alert("결제 승인 실패");
      }
    };

    if (pgToken) {
      confirmPayment();
    }
  }, [pgToken]);

  return <h2>결제 처리 중입니다...</h2>;
}