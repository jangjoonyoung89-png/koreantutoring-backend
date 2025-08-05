require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const morgan = require("morgan");

const app = express();
const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: [
      "https://koreantutoring-frontend.onrender.com",
      "http://localhost:3000",
      "http://localhost:3002",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("✅ 사용자 연결됨:", socket.id);

  socket.on("join-room", ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`📺 유저 ${userId}가 룸 ${roomId}에 입장함`);

    socket.to(roomId).emit("user-connected", userId);

    socket.on("disconnect", () => {
      console.log(`❌ 유저 ${userId} 연결 종료`);
      socket.to(roomId).emit("user-disconnected", userId);
    });
  });
});


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


app.use(
  cors({
    origin: [
      "https://koreantutoring-frontend.onrender.com",
      "http://localhost:3000",
      "http://localhost:3002",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads"));
app.use("/videos", express.static("uploads/videos"));


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
app.use("/api/tutors", tutorRoutes);
app.use("/api/materials", materialBoardRoutes);


app.get("/ping", (req, res) => res.send("pong"));

app.get("/", (req, res) => {
  res.send("Korean Tutoring API is running!");
});

app.get("/api/tutors/1", (req, res) => {
  res.json({
    id: 1,
    name: "장준영",
    experience: 5,
    intro: "한국어 튜터입니다.",
  });
});


mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("✅ MongoDB 연결 성공");

    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
      console.log(`✅ 서버 실행: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB 연결 실패:", err);
  });