const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); 
  },
});

const upload = multer({ storage });


router.post("/upload-profile", upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ detail: "파일이 업로드되지 않았습니다." });
  }
  res.json({ imageUrl: `/uploads/${req.file.filename}` });
});

module.exports = router;