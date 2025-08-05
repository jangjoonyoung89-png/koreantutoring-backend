const express = require('express');
const multer = require('multer');
const Post = require('../models/Post');
const router = express.Router();


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/materials/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });


router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.post('/', upload.single('file'), async (req, res) => {
  try {
    const { title, content, tutorId } = req.body;
    const filePath = req.file ? req.file.path : null;

    const post = new Post({ title, content, tutorId, filePath });
    await post.save();
    res.status(201).json({ message: '게시글 업로드 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    res.json(post);
  } catch (err) {
    res.status(404).json({ error: '게시글을 찾을 수 없습니다' });
  }
});

module.exports = router;