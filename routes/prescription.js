const express = require("express");

const router = express.Router();

const {
  createPrescription,
  updatePrescription,
  doctorPrescriptions,
  getPrescriptionByConsultation
} = require(
  "../controllers/prescriptionController"
);

const {
  authenticateDoctor
} = require("../lib/auth");

router.post(
  "/create",
  authenticateDoctor,
  createPrescription
);

router.put(
  "/update/:id",
  authenticateDoctor,
  updatePrescription
);

router.get(
  "/doctor",
  authenticateDoctor,
  doctorPrescriptions
);

router.get(
  "/consultation/:consultationId",
  authenticateDoctor,
  getPrescriptionByConsultation
);

module.exports = router;