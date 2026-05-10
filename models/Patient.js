const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({

  profilePicture: String,

  name: {
    type: String,
    required: true
  },

  age: Number,

  email: {
    type: String,
    unique: true
  },

  phone: {
    type: String,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  surgeryHistory: [String],

  illnessHistory: [String]

}, {
  timestamps: true
});

module.exports = mongoose.model("Patient", patientSchema);