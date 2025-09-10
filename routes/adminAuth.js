const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ detail: "존재하지 않는 계정" });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ detail: "비밀번호가 틀렸습니다" });

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      "your_jwt_secret", // 실제 환경에서는 process.env.JWT_SECRET 사용
      { expiresIn: "1d" }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;