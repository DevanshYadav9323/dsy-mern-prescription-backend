const Doctor = require("../models/Doctor");
const Consultation = require("../models/Consultation");
const Prescription = require("../models/Prescription");


const {
  generateToken,
  hashPassword,
  comparePassword,
  successResponse,
  errorResponse
} = require("../lib/helper");

const signup = async (req, res) => {

  try {

    const {
      name,
      specialty,
      email,
      phone,
      password,
      experience,
      profilePicture
    } = req.body;

    const existingDoctor =
      await Doctor.findOne({
        $or: [
          { email },
          { phone }
        ]
      });

    if (existingDoctor) {

      return errorResponse(
        res,
        "Doctor already exists"
      );

    }

    const hashedPassword =
      await hashPassword(password);

    const doctor = await Doctor.create({

      name,
      specialty,
      email,
      phone,
      experience,
      profilePicture,

      password: hashedPassword

    });

    const token =
      generateToken(doctor._id);

    return successResponse(
      res,
      "Doctor registered successfully",
      {
        token,
        doctor
      }
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};

const signin = async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const doctor =
      await Doctor.findOne({ email });

    if (!doctor) {

      return errorResponse(
        res,
        "Doctor not found"
      );

    }

    const isMatch =
      await comparePassword(
        password,
        doctor.password
      );

    if (!isMatch) {

      return errorResponse(
        res,
        "Invalid credentials"
      );

    }

    const token =
      generateToken(doctor._id);

    return successResponse(
      res,
      "Doctor login successful",
      {
        token,
        doctor
      }
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};

const getDoctors = async (req, res) => {

  try {

    const doctors =
      await Doctor.find()
      .select("-password");

    return successResponse(
      res,
      "Doctors fetched successfully",
      doctors
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};


const doctorDashboard =
  async (req, res) => {

  try {

    const doctor = req.doctor;

    const consultations =
      await Consultation.find({
        doctor: doctor._id
      });

    const prescriptions =
      await Prescription.find({
        doctor: doctor._id
      });

    const totalConsultations =
      consultations.length;

    const completedConsultations =
      consultations.filter(
        (item) =>
          item.status === "Completed"
      ).length;

    const pendingConsultations =
      consultations.filter(
        (item) =>
          item.status === "Pending"
      ).length;

    const totalPrescriptions =
      prescriptions.length;

    /*
    =====================================
    LAST 7 DAYS CONSULTATION GRAPH
    =====================================
    */

    const chartData = [];

    for (let i = 6; i >= 0; i--) {

      const currentDate =
        new Date();

      currentDate.setDate(
        currentDate.getDate() - i
      );

      const startOfDay =
        new Date(currentDate);

      startOfDay.setHours(0,0,0,0);

      const endOfDay =
        new Date(currentDate);

      endOfDay.setHours(23,59,59,999);

      const count =
        consultations.filter((item) => {

          return (
            item.createdAt >= startOfDay &&
            item.createdAt <= endOfDay
          );

        }).length;

      chartData.push({

        day:
          currentDate.toLocaleDateString(
            "en-US",
            {
              weekday: "short"
            }
          ),

        consultations:
          count

      });

    }

    return res.status(200).json({

      error: false,

      data: {

        doctor,

        stats: {
          totalConsultations,
          completedConsultations,
          pendingConsultations,
          totalPrescriptions
        },

        chartData

      }

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      error: true,
      message: "Something went wrong"
    });

  }

};

module.exports = {
  signup,
  signin,
  getDoctors,
  doctorDashboard,
};