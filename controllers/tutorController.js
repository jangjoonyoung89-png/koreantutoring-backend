const Tutor = require("../models/Tutor");

exports.uploadIntroVideo = async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "업로드된 파일이 없습니다." });
    }

    
    const videoUrl = `http://localhost:8000/videos/${file.filename}`;

    
    const tutor = await Tutor.findByIdAndUpdate(
      tutorId,
      { introVideo: videoUrl },
      { new: true }
    );

    res.json({ message: "소개 영상 업로드 성공", videoUrl });
  } catch (error) {
    console.error("업로드 실패:", error);
    res.status(500).json({ message: "소개 영상 업로드 실패" });
  }
};

exports.getTutorById = async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ error: "튜터를 찾을 수 없습니다." });

    res.json(tutor); 
  } catch (err) {
    console.error("튜터 조회 오류", err);
    res.status(500).json({ error: "튜터 조회 중 오류" });
  }
};