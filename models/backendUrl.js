const mongoose = require("mongoose");

const backendUrlSchema = new mongoose.Schema({
  url: String,
}, { timestamps: true });

module.exports = mongoose.model("backend_url", backendUrlSchema);