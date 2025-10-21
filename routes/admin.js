const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Material = require("../models/Material");
const User = require("../models/User");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ===================================================
// 📂 업로드 폴더 자동 생성
// ===================================================
const uploadDir = path.join(__dirname, "../uploads/materials");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ===================================================
// 📁 Multer 설정 (자료 업로드)
// ===================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `material_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ===================================================
// 🧾 관리자 로그인 (DB 조회 + JWT 발급)
// ===================================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "이메일과 비밀번호를 모두 입력하세요." });
    }

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "관리자 계정을 찾을 수 없습니다." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "비밀번호가 일치하지 않습니다." });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || "default_secret_key",
      { expiresIn: "2h" }
    );

    res.json({
      success: true,
      message: "관리자 로그인 성공",
      token,
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        full_name: admin.full_name,
      },
    });
  } catch (err) {
    console.error("❌ 관리자 로그인 오류:", err);
    res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
});

// ===================================================
// 🔐 관리자 인증 미들웨어 적용
// ===================================================
router.use(authenticateToken);
router.use(authorizeRoles("admin"));

// ===================================================
// 👩‍🏫 승인 대기 튜터 목록 조회
// ===================================================
router.get("/tutors/pending", async (req, res) => {
  try {
    const tutors = await Tutor.find({ approved: false, rejected: { $ne: true } });
    res.json({ success: true, tutors });
  } catch (error) {
    console.error("튜터 목록 조회 실패:", error);
    res.status(500).json({ success: false, message: "튜터 목록 조회 실패" });
  }
});

// ===================================================
// ✅ 튜터 승인
// ===================================================
router.patch("/tutors/:id/approve", async (req, res) => {
  try {
    const tutor = await Tutor.findByIdAndUpdate(
      req.params.id,
      { approved: true, rejected: false },
      { new: true }
    );
    if (!tutor)
      return res.status(404).json({ success: false, message: "튜터를 찾을 수 없습니다." });

    res.json({ success: true, message: "튜터 승인 완료", tutor });
  } catch (error) {
    console.error("튜터 승인 실패:", error);
    res.status(500).json({ success: false, message: "튜터 승인 실패" });
  }
});

// ===================================================
// ❌ 튜터 거절
// ===================================================
router.patch("/tutors/:id/reject", async (req, res) => {
  try {
    const tutor = await Tutor.findByIdAndUpdate(
      req.params.id,
      { approved: false, rejected: true },
      { new: true }
    );
    if (!tutor)
      return res.status(404).json({ success: false, message: "튜터를 찾을 수 없습니다." });

    res.json({ success: true, message: "튜터 거절 완료", tutor });
  } catch (error) {
    console.error("튜터 거절 실패:", error);
    res.status(500).json({ success: false, message: "튜터 거절 실패" });
  }
});

// ===================================================
// 💬 리뷰 관리
// ===================================================
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("student", "full_name email")
      .populate("tutor", "name email");
    res.json({ success: true, reviews });
  } catch (err) {
    console.error("리뷰 조회 오류:", err);
    res.status(500).json({ success: false, message: "리뷰 조회 중 서버 오류" });
  }
});

router.delete("/reviews/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review)
      return res.status(404).json({ success: false, message: "리뷰를 찾을 수 없습니다." });

    await review.deleteOne();
    res.json({ success: true, message: "리뷰 삭제 완료" });
  } catch (err) {
    console.error("리뷰 삭제 오류:", err);
    res.status(500).json({ success: false, message: "리뷰 삭제 중 서버 오류" });
  }
});

// ===================================================
// 📚 자료 업로드 및 관리
// ===================================================
router.post("/materials", upload.single("file"), async (req, res) => {
  const { title, description } = req.body;

  if (!req.file || !title) {
    return res
      .status(400)
      .json({ success: false, message: "제목과 파일이 필요합니다." });
  }

  try {
    const material = new Material({
      title,
      description,
      fileUrl: `/uploads/materials/${req.file.filename}`,
    });
    await material.save();

    res.status(201).json({ success: true, message: "자료 업로드 완료", material });
  } catch (err) {
    console.error("자료 업로드 오류:", err);
    res.status(500).json({ success: false, message: "자료 업로드 중 서버 오류" });
  }
});

// 자료 전체 조회
router.get("/materials", async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.json({ success: true, materials });
  } catch (err) {
    console.error("자료 조회 오류:", err);
    res.status(500).json({ success: false, message: "자료 조회 중 서버 오류" });
  }
});

// 자료 삭제
router.delete("/materials/:id", async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material)
      return res.status(404).json({ success: false, message: "자료를 찾을 수 없습니다." });

    const filePath = path.join(__dirname, "..", material.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await material.deleteOne();
    res.json({ success: true, message: "자료 삭제 완료" });
  } catch (err) {
    console.error("자료 삭제 오류:", err);
    res.status(500).json({ success: false, message: "자료 삭제 중 서버 오류" });
  }
});

// ===================================================
// 📊 관리자 통계 API
// ===================================================
router.get("/stats", async (req, res) => {
  try {
    const totalTutors = await Tutor.countDocuments();
    const totalApprovedTutors = await Tutor.countDocuments({ approved: true });
    const totalBookings = await Booking.countDocuments();
    const totalReviews = await Review.countDocuments();

    const avgRatingData = await Review.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);
    const averageRating = avgRatingData[0]?.avgRating || 0;

    res.json({
      success: true,
      stats: {
        totalTutors,
        totalApprovedTutors,
        totalBookings,
        totalReviews,
        averageRating: Number(averageRating.toFixed(1)),
      },
    });
  } catch (err) {
    console.error("통계 조회 오류:", err);
    res.status(500).json({ success: false, message: "통계 조회 중 서버 오류" });
  }
});

// ===================================================
// 🧩 토큰 검증 (자동 로그인용)
// ===================================================
router.get("/verify-token", authenticateToken, authorizeRoles("admin"), (req, res) => {
  res.json({ success: true, message: "유효한 관리자 토큰입니다." });
});

module.exports = router;