const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({

  consultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Consultation"
  },

  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor"
  },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient"
  },

  careToBeTaken: {
    type: String,
    required: true
  },

  medicines: String,

  pdfUrl: String

}, {
  timestamps: true
});

module.exports = mongoose.model("Prescription", prescriptionSchema);