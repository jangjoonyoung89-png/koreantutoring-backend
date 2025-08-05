const mongoose = require("mongoose");

const tutorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  bio: { type: String },
  availableTimes: [
    {
      day: { type: String },             
      slots: [{ type: String }],         
    },
  ],
  
  price: Number,
  photo: String,
  email: String,
  approved: { type: Boolean, default: false },

  sampleVideoUrl: { type: String, default: "" },

  averageRating: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Tutor", tutorSchema);