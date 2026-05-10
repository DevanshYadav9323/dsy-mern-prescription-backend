const Patient = require("../models/Patient");

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
      age,
      email,
      phone,
      password,
      profilePicture,
      surgeryHistory,
      illnessHistory
    } = req.body;

    const existingPatient =
      await Patient.findOne({
        $or: [
          { email },
          { phone }
        ]
      });

    if (existingPatient) {

      return errorResponse(
        res,
        "Patient already exists"
      );

    }

    const hashedPassword =
      await hashPassword(password);

    const patient =
      await Patient.create({

        name,
        age,
        email,
        phone,
        profilePicture,

        surgeryHistory:
          surgeryHistory || [],

        illnessHistory:
          illnessHistory || [],

        password: hashedPassword

      });

    const token =
      generateToken(patient._id);

    return successResponse(
      res,
      "Patient registered successfully",
      {
        token,
        patient
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

    const patient =
      await Patient.findOne({ email });

    if (!patient) {

      return errorResponse(
        res,
        "Patient not found"
      );

    }

    const isMatch =
      await comparePassword(
        password,
        patient.password
      );

    if (!isMatch) {

      return errorResponse(
        res,
        "Invalid credentials"
      );

    }

    const token =
      generateToken(patient._id);

    return successResponse(
      res,
      "Patient login successful",
      {
        token,
        patient
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

module.exports = {
  signup,
  signin
};