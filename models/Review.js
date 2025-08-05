const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: "Tutor", required: true },  
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});


reviewSchema.post("save", async function () {
  const Tutor = require("./Tutor");
  const reviews = await this.constructor.find({ tutor: this.tutor });

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await Tutor.findByIdAndUpdate(this.tutor, { averageRating: avg.toFixed(1) });
});

module.exports = mongoose.model("Review", reviewSchema);