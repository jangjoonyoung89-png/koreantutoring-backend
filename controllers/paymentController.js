const Payment = require("../models/Payment");

exports.createPayment = async (req, res) => {
  try {
    const { tutor, student, amount, time, tutorName } = req.body;

    const payment = await Payment.create({
      tutor,
      student,
      amount,
      time,
      tutorName,
      status: "completed",
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error("결제 저장 실패:", error);
    res.status(500).json({ error: "결제 저장 중 오류 발생" });
  }
};

exports.getPaymentsByStudent = async (req, res) => {
  try {
    const studentId = req.query.student;
    const payments = await Payment.find({ student: studentId }).populate("tutor");
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: "결제 조회 실패" });
  }
};

exports.getPaymentsByTutor = async (req, res) => {
  try {
    const tutorId = req.query.tutor;

    const payments = await Payment.find({ tutor: tutorId })
      .populate("student", "name email") 
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error("튜터 결제 내역 조회 실패:", error);
    res.status(500).json({ error: "결제 내역을 불러오는 중 오류 발생" });
  }
};