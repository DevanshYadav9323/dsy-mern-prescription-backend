const Consultation =
  require("../models/Consultation");

const Doctor =
  require("../models/Doctor");

const Prescription = require("../models/Prescription");

const {
  successResponse,
  errorResponse
} = require("../lib/helper");

const createConsultation =
  async (req, res) => {

  try {

    const patient =
      req.patient;

    const {

      doctorId,

      currentIllnessHistory,

      surgery,

      surgeryStartDate,

      surgeryEndDate,

      diabeticStatus,

      allergies,

      others,

      transactionId

    } = req.body;

    const doctor =
      await Doctor.findById(
        doctorId
      );

    if (!doctor) {

      return errorResponse(
        res,
        "Doctor not found"
      );

    }

    const consultation =
      await Consultation.create({

        patient:
          patient._id,

        doctor:
          doctorId,

        currentIllnessHistory,

        recentSurgery: {

          surgery,

          startDate:
            surgeryStartDate,

          endDate:
            surgeryEndDate

        },

        diabeticStatus,

        allergies,

        others,

        transactionId

      });

    return successResponse(
      res,
      "Consultation submitted successfully",
      consultation
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};

const doctorConsultations =
  async (req, res) => {

  try {

    const doctor =
      req.doctor;

    const consultations =
      await Consultation.find({
        doctor: doctor._id
      })
      .populate("patient")
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      "Consultations fetched successfully",
      consultations
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};

const getSingleConsultation =
  async (req, res) => {

  try {

    const {
      id
    } = req.params;

    const consultation =
      await Consultation.findById(id)
      .populate("patient")
      .populate("doctor");

    if (!consultation) {

      return errorResponse(
        res,
        "Consultation not found"
      );

    }

    return successResponse(
      res,
      "Consultation fetched successfully",
      consultation
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};


const getPatientConsultations =
  async (req, res) => {

  try {

    const patient =
      req.patient;

    const consultations =
      await Consultation.find({

        patient:
          patient._id

      })

      .populate(
        "doctor"
      )

      .sort({
        createdAt: -1
      });

    return successResponse(
      res,
      "Consultations fetched successfully",
      consultations
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};

const getPatientPrescriptions =
  async (req, res) => {

  try {

    const patient =
      req.patient;

    const prescriptions =
      await Prescription.find({

        patient:
          patient._id

      })

      .populate(
        "doctor"
      )

      .populate(
        "consultation"
      )

      .sort({
        createdAt: -1
      });

    return successResponse(
      res,
      "Prescriptions fetched successfully",
      prescriptions
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};

module.exports = {
  createConsultation,
  doctorConsultations,
  getSingleConsultation,
  getPatientConsultations,
getPatientPrescriptions
};