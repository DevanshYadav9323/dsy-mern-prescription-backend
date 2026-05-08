const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const brandSchema = new Schema(
  {
    brandName: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String
    },

    contactPerson: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      required: true,
      unique: true
    },

    otp: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("brand", brandSchema);
