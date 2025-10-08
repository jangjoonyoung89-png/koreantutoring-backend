const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function requireAdmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "인증 토큰이 없습니다." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "관리자 권한이 필요합니다." });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("requireAdmin 에러:", err);
    res.status(403).json({ message: "유효하지 않은 관리자 토큰입니다." });
  }
};