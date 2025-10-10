const jwt = require("jsonwebtoken");

/**
 * ===============================
 * 🔐 JWT 인증 미들웨어
 * ===============================
 * - Authorization 헤더에서 Bearer 토큰 추출
 * - 유효성 검사 후 req.user에 사용자 정보 저장
 * - 실패 시 401 또는 403 반환
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Bearer 토큰 유무 확인
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ detail: "인증 정보가 없습니다." });
    }

    // Bearer 뒤의 실제 토큰 추출
    const token = authHeader.split(" ")[1];

    // JWT 검증
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");

    // 사용자 정보 저장
    req.user = decoded; // 예: { id, email, role, iat, exp }
    next();
  } catch (err) {
    console.error("❌ JWT 인증 실패:", err.message);
    return res.status(403).json({ detail: "유효하지 않은 토큰입니다." });
  }
};

/**
 * ===============================
 * 🧩 역할(권한) 검사 미들웨어
 * ===============================
 * @param {...string} roles 허용된 역할 목록 (예: ["admin", "tutor"])
 * - req.user.role이 roles에 포함되지 않으면 접근 거부
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ detail: "인증되지 않은 사용자입니다." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ detail: "권한이 없습니다." });
    }

    next();
  };
};

/**
 * ===============================
 * 👑 관리자 전용 미들웨어
 * ===============================
 * - role이 'admin'이 아닐 경우 403 반환
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ detail: "관리자 권한이 필요합니다." });
  }
  next();
};

/**
 * ===============================
 * 🎯 requireRole(role)
 * ===============================
 * - 기존 코드 호환용 alias
 * - 예: router.get("/admin", requireRole("admin"), handler)
 */
const requireRole = (role) => authorizeRoles(role);

/**
 * ===============================
 * 📦 모듈 내보내기
 * ===============================
 */
module.exports = {
  authenticateToken,
  authorizeRoles,
  requireAdmin,
  requireRole,
};