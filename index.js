require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express(); 

const tutorRoutes = require("./routes/tutors");
const bookingRoutes = require("./routes/booking");
const paymentRoutes = require("./routes/payment");
const profileRoutes = require("./routes/profile");
const usersRouter = require("./routes/users");
const authRoutes = require("./routes/auth");
const { startSession } = require("./models/Tutor");
const reviewRoutes = require("./routes/reviews");
const availabilityRoutes = require("./routes/availability");
const studentBookingRoutes = require("./routes/studentBookings");
const statsRoutes = require("./routes/stats");

app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3002"],
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/auth", authRoutes);
app.use("/payments", paymentRoutes);

app.use("/bookings", bookingRoutes);
app.use("/profile", profileRoutes);
app.use("/api/users", usersRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/availability", availabilityRoutes);
app.use("/my-bookings", studentBookingRoutes);
app.use("/videos", express.static("uploads/videos"));
app.use("/api/stats", statsRoutes);

app.get("/ping", (req, res) => res.send("pong"));


app.get('/api/tutors/1', (req, res) => {
  res.json({
    id: 1,
    name: "장준영",
    experience: 5,
    intro: "한국어 튜터입니다."
  });
});


app.use("/api/tutors", tutorRoutes);


mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB 연결 성공");
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
      console.log(`✅ 서버 실행: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ MongoDB 연결 실패:", err);
  });