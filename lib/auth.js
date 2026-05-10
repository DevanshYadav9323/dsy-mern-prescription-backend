const jwt = require("jsonwebtoken");

const doctorModel = require("../models/Doctor");
const patientModel = require("../models/Patient");

const authenticateDoctor = async (req, res, next) => {
  try {

    let token =
      req.headers.authorization || req.query.authorization;

    if (!token) {
      throw new Error("No token provided");
    }

    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(
      token,
      process.env.jwt_secret
    );

    const doctorData = await doctorModel.findById(decoded._id);

    if (!doctorData) {
      throw new Error("Doctor not found");
    }

    req.doctor = doctorData;

    next();

  } catch (error) {

    console.log(error);

    return res.status(401).json({
      error: true,
      message: "Authorization required"
    });

  }
};

const authenticatePatient = async (req, res, next) => {
  try {

    let token =
      req.headers.authorization || req.query.authorization;

    if (!token) {
      throw new Error("No token provided");
    }

    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(
      token,
      process.env.jwt_secret
    );

    const patientData = await patientModel.findById(decoded._id);

    if (!patientData) {
      throw new Error("Patient not found");
    }

    req.patient = patientData;

    next();

  } catch (error) {

    console.log(error);

    return res.status(401).json({
      error: true,
      message: "Authorization required"
    });

  }
};

module.exports = {
    authenticateDoctor,
    authenticatePatient
};