const express = require("express");

const router = express.Router();

const {
  signup,
  signin,
  getDoctors,
  doctorDashboard
} = require("../controllers/doctorController");

const {
  authenticateDoctor
} = require("../lib/auth");

router.post("/signup", signup);

router.post("/signin", signin);

router.get("/list", getDoctors);

router.get(
  "/dashboard",
  authenticateDoctor,
  doctorDashboard
);

router.get(
  "/profile",
  authenticateDoctor,
  (req, res) => {

    return res.status(200).json({
      error: false,
      doctor: req.doctor
    });

  }
);

module.exports = router;