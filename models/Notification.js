const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true },
    type: { type: String, enum: ["booking", "review", "message", "system"], default: "system" },
    isRead: { type: Boolean, default: false },
    link: { type: String }, // 클릭 시 이동할 링크 (예: /bookings/123)
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);