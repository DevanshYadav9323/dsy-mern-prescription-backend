const express = require("express");

const router = express.Router();

const {
  signup,
  signin
} = require("../controllers/patientController");

const {
  authenticatePatient
} = require("../lib/auth");

router.post("/signup", signup);

router.post("/signin", signin);

router.get(
  "/profile",
  authenticatePatient,
  (req, res) => {

    return res.status(200).json({
      error: false,
      patient: req.patient
    });

  }
);

module.exports = router;