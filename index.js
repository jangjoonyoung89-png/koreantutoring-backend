require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");
const path = require("path");
const i18n = require("i18n");
const fs = require("fs");

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
  process.env.FRONTEND_URL,
  "https://www.koreantutoring-backend.onrender.com",
  "https://www.koreantutoring-frontend.onrender.com",
  "https://api.koreantutoring.co.kr",
  "https://www.koreantutoring.co.kr",
  "http://localhost:3000",
  "http://localhost:3002",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.includes(origin)) {
        return callback(new Error(`CORS 차단: ${origin}`), false);
      }
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

// 정적 파일 제공
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/videos", express.static(path.join(__dirname, "uploads/videos")));

// ===========================
// 업로드 폴더 자동 생성
// ===========================
const uploadDir = "uploads/videos";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

/** ======================
 * Socket.io 설정 (실시간 수업)
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

    // WebRTC 시그널 전달
    socket.on("signal", (data) => {
      socket.to(roomId).emit("signal", { userId, signal: data });
    });

    socket.on("disconnect", () => {
      console.log(`❌ 유저 ${userId} 연결 종료`);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});

/** ======================
 * 샘플 튜터 데이터
 * ====================== */
const sampleTutors = [
  {
    _id: "sample1",
    name: "장준영",
    bio: "한국어 교육 전문가입니다.",
    price: 30000,
    photo: "https://tinyurl.com/lego1",
    email: "sample1@test.com",
    approved: true,
    averageRating: 4.5,
    reviewCount: 10,
    sampleVideos: [],
  },
  {
    _id: "sample2",
    name: "장서은",
    bio: "비즈니스 한국어 전문 튜터입니다.",
    price: 35000,
    photo: "https://tinyurl.com/lego2",
    email: "sample2@test.com",
    approved: true,
    averageRating: 4.7,
    reviewCount: 8,
    sampleVideos: [],
  },
  {
    _id: "sample3",
    name: "김수영",
    bio: "회화 중심 수업을 제공합니다.",
    price: 28000,
    photo: "https://tinyurl.com/lego3",
    email: "sample3@test.com",
    approved: true,
    averageRating: 4.8,
    reviewCount: 12,
    sampleVideos: [],
  },
];

/** ======================
 * 모델 불러오기
 * ====================== */
const Tutor = require("./models/Tutor");
const Review = require("./models/Review");
const Booking = require("./models/Booking");
const Material = require("./models/Material");

/** ======================
 * 미들웨어 불러오기
 * ====================== */
const { authenticateToken, authorizeRoles } = require("./middleware/auth");

/** ======================
 * 라우터 불러오기
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
const videosRoutes = require("./routes/videos"); // 샘플 영상 + 업로드

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
app.use("/api/materials", materialBoardRoutes);
app.use("/tutor-verification", tutorVerificationRoutes);
app.use("/api/videos", videosRoutes);
app.use("/api/admin/qa", require("./routes/adminQA"));

// tutors 라우트 → DB 연결 안 되면 샘플 데이터 반환
let dbConnected = false;
app.use(
  "/api/tutors",
  async (req, res, next) => {
    if (!dbConnected) {
      console.log("⚠️ DB 연결 안 됨 → 샘플 튜터 반환");
      return res.json(sampleTutors);
    }
    next();
  },
  tutorRoutes
);

/** ======================
 * 예약 테스트용 API
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
 * 루트 라우트
 * ====================== */
app.get("/", (req, res) => {
  res.send("✅ Backend API is running 🚀");
});

/** ======================
 * MongoDB 연결 + 샘플 데이터 자동 삽입
 * ====================== */
mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log("✅ MongoDB 연결 성공");
    dbConnected = true;

    const count = await Tutor.countDocuments();
    if (count === 0) {
      await Tutor.insertMany(sampleTutors);
      console.log("✅ 샘플 튜터 데이터 추가 완료");
    }

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => console.log(`✅ 서버 실행 중: 포트 ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB 연결 실패:", err.message);
    dbConnected = false;
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () =>
      console.log(`⚠️ DB 연결 실패 → 샘플 데이터 모드로 포트 ${PORT} 실행`)
    );
  });

/** ======================
 * export
 * ====================== */
module.exports = { app, server, sampleTutors, Tutor };