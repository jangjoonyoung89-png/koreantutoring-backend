const jwt = require("jsonwebtoken");

function requireAuth(role) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ detail: "인증 토큰이 없습니다." });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // { userId, role } 구조 예상

      // 역할(role) 체크
      if (role && req.user.role !== role) {
        return res.status(403).json({ detail: "권한이 없습니다." });
      }

      next();
    } catch (err) {
      console.error("JWT 인증 오류:", err);
      res.status(401).json({ detail: "유효하지 않은 토큰입니다." });
    }
  };
}

module.exports = requireAuth;