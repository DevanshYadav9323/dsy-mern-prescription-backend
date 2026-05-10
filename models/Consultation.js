const mongoose =
  require("mongoose");

const consultationSchema =
  new mongoose.Schema({

  patient: {

    type:
      mongoose.Schema.Types.ObjectId,

    ref: "Patient"

  },

  doctor: {

    type:
      mongoose.Schema.Types.ObjectId,

    ref: "Doctor"

  },

  currentIllnessHistory: {

    type: String,

    required: true

  },

  recentSurgery: {

    surgery: {

      type: String,

      required: true

    },

    startDate: {

      type: Date,

      required: true

    },

    endDate: {

      type: Date,

      required: true

    }

  },

  diabeticStatus: {

    type: String,

    enum: [
      "Diabetic",
      "Non-Diabetic"
    ],

    required: true

  },

  allergies: {

    type: String,

    required: true

  },

  others: {

    type: String,

    required: true

  },

  transactionId: {

    type: String,

    required: true

  },

  status: {

    type: String,

    default: "Pending"

  }

}, {

  timestamps: true

});

module.exports =
  mongoose.model(
    "Consultation",
    consultationSchema
  );