const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bio: { type: String },
  availableTimes: [
    {
      day: { type: String },             // 예: "Monday"
      slots: [{ type: String }],         // 예: ["10:00", "11:00"]
    },
  ],
  
  price: Number,
  photo: String,
  email: String,

  sampleVideoUrl: { type: String, default: "" },

  averageRating: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Tutor", tutorSchema);