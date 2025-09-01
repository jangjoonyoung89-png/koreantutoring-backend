const Notification = require("../models/Notification");

const sendNotification = async ({ recipientId, message, type = "system", link = "" }) => {
  try {
    const newNotification = new Notification({
      recipient: recipientId,
      message,
      type,
      link,
      read: false,       // 기본값: 읽지 않은 상태
      createdAt: new Date(), // 생성 시간 명시
    });
    await newNotification.save();
  } catch (err) {
    console.error("❌ 알림 생성 실패:", err.message);
  }
};

module.exports = sendNotification;