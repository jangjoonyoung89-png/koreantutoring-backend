const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const Tutor = require("../models/Tutor");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Material = require("../models/Material");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ======================
// Multer 설정 (자료 업로드)
// ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/materials"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `material_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ======================
// 관리자 로그인 (샘플용)
// ======================
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "1234") {
    return res.json({ success: true, token: "admin-token" });
  }
  return res.status(401).json({ success: false, message: "Invalid credentials" });
});

// ======================
// 관리자 전용 권한 체크
// ======================
router.use(authenticateToken);
router.use(authorizeRoles("admin"));

// ======================
// 승인 대기 튜터 목록 조회
// ======================
router.get("/tutors/pending", async (req, res) => {
  try {
    const tutors = await Tutor.find({ approved: false, rejected: { $ne: true } });
    res.json(tutors);
  } catch (error) {
    console.error("튜터 목록 조회 실패:", error);
    res.status(500).json({ message: "튜터 목록 조회 실패" });
  }
});

// ======================
// 튜터 승인/거절
// ======================
router.patch("/tutors/:id/approve", async (req, res) => {
  try {
    const tutor = await Tutor.findByIdAndUpdate(
      req.params.id,
      { approved: true, rejected: false },
      { new: true }
    );
    if (!tutor) return res.status(404).json({ message: "튜터를 찾을 수 없습니다." });
    res.json({ message: "튜터 승인 완료", tutor });
  } catch (error) {
    console.error("튜터 승인 실패:", error);
    res.status(500).json({ message: "튜터 승인 실패" });
  }
});

router.patch("/tutors/:id/reject", async (req, res) => {
  try {
    const tutor = await Tutor.findByIdAndUpdate(
      req.params.id,
      { approved: false, rejected: true },
      { new: true }
    );
    if (!tutor) return res.status(404).json({ message: "튜터를 찾을 수 없습니다." });
    res.json({ message: "튜터 거절 완료", tutor });
  } catch (error) {
    console.error("튜터 거절 실패:", error);
    res.status(500).json({ message: "튜터 거절 실패" });
  }
});

// ======================
// 리뷰 관리
// ======================
router.get("/reviews", async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("student", "full_name email")
      .populate("tutor", "name email");
    res.json(reviews);
  } catch (err) {
    console.error("리뷰 조회 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

router.delete("/reviews/:id", async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ detail: "리뷰 없음" });
    await review.deleteOne();
    res.json({ message: "리뷰 삭제 완료" });
  } catch (err) {
    console.error("리뷰 삭제 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// ======================
// 자료 업로드 관리
// ======================
router.post("/materials", upload.single("file"), async (req, res) => {
  const { title, description } = req.body;
  if (!req.file || !title) return res.status(400).json({ detail: "제목과 파일 필요" });

  try {
    const material = new Material({
      title,
      description,
      fileUrl: `/uploads/materials/${req.file.filename}`,
    });
    await material.save();
    res.status(201).json({ message: "자료 업로드 완료", material });
  } catch (err) {
    console.error("자료 업로드 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

router.get("/materials", async (req, res) => {
  try {
    const materials = await Material.find();
    res.json(materials);
  } catch (err) {
    console.error("자료 조회 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

router.delete("/materials/:id", async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ detail: "자료 없음" });
    await material.deleteOne();
    res.json({ message: "자료 삭제 완료" });
  } catch (err) {
    console.error("자료 삭제 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

// ======================
// 통계 API
// ======================
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
      totalTutors,
      totalApprovedTutors,
      totalBookings,
      totalReviews,
      averageRating: Number(averageRating.toFixed(1)),
    });
  } catch (err) {
    console.error("통계 조회 오류:", err);
    res.status(500).json({ detail: "서버 오류" });
  }
});

module.exports = router;