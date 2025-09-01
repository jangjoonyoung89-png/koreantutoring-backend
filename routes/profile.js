const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Tutor = require("../models/Tutor");

// 임시 유저 데이터 (실제 DB 모델로 대체 예정)
let users = [
  { id: 101, full_name: "홍길동", email: "test@example.com", password: "1234" }
];

// 임시 인증 미들웨어 (JWT 기반으로 교체 필요)
function mockAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "인증이 필요합니다." });
  }

  // 실제 환경에서는 JWT에서 userId를 추출해야 함
  req.user = { id: 101 }; 
  next();
}

// 사용자 정보 수정 (PUT /api/users)
router.put("/", mockAuth, (req, res) => {
  const { full_name, email, password } = req.body;
  const userId = req.user.id;

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });
  }

  user.full_name = full_name || user.full_name;
  user.email = email || user.email;
  if (password) user.password = password;

  res.json({ user });
});

// 프로필 이미지 업로드를 위한 multer 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // 서버의 uploads/ 폴더에 저장
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// 튜터 프로필 이미지 업로드
router.post("/upload-profile", upload.single("profile"), async (req, res) => {
  try {
    // 파일 유무 확인
    if (!req.file) {
      return res.status(400).json({ detail: "파일이 첨부되지 않았습니다." });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const { tutorId } = req.body;

    const tutor = await Tutor.findByIdAndUpdate(
      tutorId,
      { profileImage: fileUrl },
      { new: true }
    );

    if (!tutor) {
      return res.status(404).json({ detail: "해당 튜터를 찾을 수 없습니다." });
    }

    res.json({ message: "업로드 성공", imageUrl: fileUrl, tutor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "업로드 실패" });
  }
});

module.exports = router;