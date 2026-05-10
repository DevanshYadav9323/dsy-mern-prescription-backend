const express = require("express");

const router = express.Router();

const {
  createConsultation,
  doctorConsultations,
  getSingleConsultation,
  getPatientConsultations,
  getPatientPrescriptions,
} = require(
  "../controllers/consultationController"
);

const {
  authenticateDoctor,
  authenticatePatient
} = require("../lib/auth");

router.post(
  "/create",
  authenticatePatient,
  createConsultation
);

router.get(
  "/doctor",
  authenticateDoctor,
  doctorConsultations
);


router.get(
  "/my-consultations",
  authenticatePatient,
  getPatientConsultations
);

router.get(
  "/my-prescriptions",
  authenticatePatient,
  getPatientPrescriptions
);

router.get(
  "/:id",
  authenticateDoctor,
  getSingleConsultation
);

module.exports = router;