require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const path = require("path");
const i18n = require("i18n");

const app = express();
const server = http.createServer(app);

/** ======================
 * i18n 다국어 설정
 * ====================== */
i18n.configure({
  locales: ["ko", "en"],
  directory: path.join(__dirname, "locales"),
  defaultLocale: "ko",
  queryParameter: "lang",
  autoReload: true,
  syncFiles: true,
  objectNotation: true,
});
app.use(i18n.init);
app.use((req, res, next) => {
  const lang = req.query.lang;
  if (lang && ["ko", "en"].includes(lang)) req.setLocale(lang);
  next();
});

/** ======================
 * CORS 설정
 * ====================== */
const allowedOrigins = [
  process.env.FRONTEND_URL || "https://koreantutoring-frontend.onrender.com",
  "http://localhost:3000",
  "http://localhost:3002",
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // 서버 직접 호출 허용
      if (!allowedOrigins.includes(origin))
        return callback(new Error(`CORS 차단: ${origin}는 허용되지 않음`), false);
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

/** ======================
 * 기본 미들웨어
 * ====================== */
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/videos", express.static(path.join(__dirname, "uploads/videos")));

/** ======================
 * Socket.io 설정
 * ====================== */
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});
io.on("connection", (socket) => {
  console.log("✅ 사용자 연결됨:", socket.id);
  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`📺 유저 ${userId}가 룸 ${roomId} 입장`);
    socket.to(roomId).emit("user-connected", userId);
    socket.on("disconnect", () => {
      console.log(`❌ 유저 ${userId} 연결 종료`);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

/** ======================
 * 샘플 튜터 데이터 (DB 장애 시 fallback)
 * ====================== */
const sampleTutors = [
  {
    _id: "66bca24e6f6e3b1f44a9a111",
    name: "장준영",
    email: "sample1@test.com",
    experience: 4,
    bio: "한국어 교육 전문가입니다.",
    specialty: "TOPIK 대비",
    language: "한국어, 영어",
    price: 30000,
    img: "https://tinyurl.com/lego1",
  },
  {
    _id: "66bca24e6f6e3b1f44a9a222",
    name: "장서은",
    email: "sample2@test.com",
    experience: 5,
    bio: "다양한 레벨의 학생들을 지도해 왔습니다.",
    specialty: "비즈니스 한국어",
    language: "한국어, 일본어",
    price: 35000,
    img: "https://tinyurl.com/lego2",
  },
  {
    _id: "66bca24e6f6e3b1f44a9a333",
    name: "김수영",
    email: "sample3@test.com",
    experience: 6,
    bio: "맞춤형 수업을 제공합니다.",
    specialty: "회화 중심",
    language: "한국어, 중국어",
    price: 28000,
    img: "https://tinyurl.com/lego3",
  },
];

/** ======================
 * 모델 불러오기
 * ====================== */
const Tutor = require("./models/Tutor");

/** ======================
 * 라우터 설정
 * ====================== */
const tutorRoutes = require("./routes/tutors");
const bookingRoutes = require("./routes/booking");
const paymentRoutes = require("./routes/payment");
const profileRoutes = require("./routes/profile");
const usersRouter = require("./routes/users");
const authRoutes = require("./routes/auth");
const reviewRoutes = require("./routes/reviews");
const availabilityRoutes = require("./routes/availability");
const studentBookingRoutes = require("./routes/studentBookings");
const statsRoutes = require("./routes/stats");
const adminRoutes = require("./routes/admin");
const materialBoardRoutes = require("./routes/materialBoard");
const tutorVerificationRoutes = require("./routes/tutorVerification");
const { authenticateToken, authorizeRoles } = require("./middleware/auth");

/** ======================
 * API 라우팅
 * ====================== */
app.use("/auth", authRoutes);
app.use("/payments", paymentRoutes);
app.use("/bookings", bookingRoutes);
app.use("/profile", profileRoutes);
app.use("/api/users", usersRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/availability", availabilityRoutes);
app.use("/my-bookings", studentBookingRoutes);
app.use("/api/stats", statsRoutes);
app.use("/admin", adminRoutes);
app.use("/api/tutors", tutorRoutes); // ← 핵심 라우터
app.use("/api/materials", materialBoardRoutes);
app.use("/tutor-verification", tutorVerificationRoutes);

/** ======================
 * 튜터 목록 API (DB → 샘플 데이터 fallback)
 * ====================== */
app.get("/api/tutors", async (req, res) => {
  try {
    const tutors = await Tutor.find();
    if (!tutors || tutors.length === 0) throw new Error("튜터 없음");
    return res.json(tutors);
  } catch (err) {
    console.warn("DB에서 튜터 로드 실패 → 샘플 데이터 사용");
    return res.json(sampleTutors);
  }
});

/** ======================
 * 튜터 상세 조회 API
 * ====================== */
app.get("/api/tutors/:id", async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) throw new Error("튜터 없음");
    res.json(tutor);
  } catch (err) {
    console.warn("DB에서 튜터 로드 실패 → 샘플 데이터 사용");
    const sampleTutor = sampleTutors.find((t) => String(t._id) === String(req.params.id));
    if (sampleTutor) return res.json(sampleTutor);
    return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });
  }
});

/** ======================
 * 예약 관련 API
 * ====================== */
app.get("/api/tutors/:id/available-dates", (req, res) => {
  res.json(["2025-08-16", "2025-08-17", "2025-08-18"]);
});
app.get("/api/tutors/:id/available-times", (req, res) => {
  res.json(["10:00", "11:00", "14:00", "16:00"]);
});
app.post("/api/bookings", (req, res) => {
  const { tutorId, date, time, studentName } = req.body;
  console.log("📅 예약 요청:", { tutorId, date, time, studentName });
  res.json({ message: "예약 완료", booking: { tutorId, date, time, studentName } });
});

/** ======================
 * 튜터 전용 접근 예시
 * ====================== */
app.get("/tutor-only-data", authenticateToken, authorizeRoles("tutor"), (req, res) => {
  res.json({ message: "튜터 인증된 사용자만 접근 가능" });
});

/** ======================
 * 루트 라우트 (Render 확인용)
 * ====================== */
app.get("/", (req, res) => {
  res.send("✅ Backend API is running 🚀");
});

/** ======================
 * MongoDB 연결 및 서버 실행
 * ====================== */
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("✅ MongoDB 연결 성공");
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`✅ 서버 실행 중: 포트 ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB 연결 실패:", err.message);
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () =>
      console.log(`⚠️ DB 연결 실패 → 샘플 데이터 모드로 포트 ${PORT} 실행`)
    );
  });