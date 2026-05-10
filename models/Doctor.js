const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  profilePicture: String,

  name: {
    type: String,
    required: true
  },

  specialty: {
    type: String,
    required: true
  },

  email: {
    type: String,
    unique: true,
    required: true
  },

  phone: {
    type: String,
    unique: true,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  experience: {
    type: Number,
    required: true
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Doctor", doctorSchema);