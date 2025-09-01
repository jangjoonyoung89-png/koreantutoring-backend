const jwt = require("jsonwebtoken");

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Authorization 헤더가 없거나 'Bearer '로 시작하지 않는 경우 401 반환
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "인증 정보가 없습니다." });
  }

  // 토큰 추출
  const token = authHeader.split(" ")[1];

  try {
    // 토큰 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");

    // 디코딩된 사용자 정보 req.user에 저장
    req.user = decoded; // 예: { id, email, role, iat, exp }
    next();
  } catch (err) {
    // 토큰이 유효하지 않을 경우 403 반환
    return res.status(403).json({ detail: "유효하지 않은 토큰입니다." });
  }
};

// 역할(권한) 체크 미들웨어
// roles는 허용할 역할 배열 예: ["admin", "tutor"]
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ detail: "권한이 없습니다." });
    }
    next();
  };
};

// 관리자 권한 체크 미들웨어
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ detail: "권한이 없습니다." });
  }
  next();
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
};