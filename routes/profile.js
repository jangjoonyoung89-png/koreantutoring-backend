const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Tutor = require("../models/Tutor"); 

let users = [
  { id: 101, full_name: "홍길동", email: "test@example.com", password: "1234" }
];

function mockAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "인증이 필요합니다." });
  }

  req.user = { id: 101 }; 
  next();
}

router.put("/", mockAuth, (req, res) => {
  const { full_name, email, password } = req.body;
  const userId = req.user.id;

  const user = users.find((u) => u.id === userId);
  if (!user) return res.status(404).json({ detail: "사용자를 찾을 수 없습니다." });

  user.full_name = full_name || user.full_name;
  user.email = email || user.email;
  if (password) user.password = password;

  res.json({ user });
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post("/upload-profile", upload.single("profile"), async (req, res) => {
  try {
    const fileUrl = `/uploads/${req.file.filename}`;
    
    
    const { tutorId } = req.body;
    const tutor = await Tutor.findByIdAndUpdate(
      tutorId,
      { profileImage: fileUrl },
      { new: true }
    );

    res.json({ message: "업로드 성공", imageUrl: fileUrl, tutor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "업로드 실패" });
  }
});

module.exports = router;