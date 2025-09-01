const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 저장 폴더 동적 생성
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 사진 업로드용
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/photos";
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

// 비디오 업로드용
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/videos";
    ensureDirExists(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${ext}`);
  },
});

const photoUpload = multer({ storage: photoStorage });
const videoUpload = multer({ storage: videoStorage });

module.exports = { photoUpload, videoUpload };