module.exports = (req, res, next) => {
  
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: '관리자 전용입니다.' });
  }
  next();
};