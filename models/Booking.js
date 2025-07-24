const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  notes: { type: String }
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);