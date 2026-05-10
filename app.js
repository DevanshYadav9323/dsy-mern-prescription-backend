require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const cors = require("cors");

const doctorRouter = require("./routes/doctor");
const patientRouter = require("./routes/patient");
const consultationRouter = require("./routes/consultation");
const prescriptionRouter = require("./routes/prescription");

const app = express();

app.use(cors());

app.use(logger("dev"));

app.use(express.json({
  limit: "50mb"
}));

app.use(express.urlencoded({
  extended: true,
  limit: "50mb"
}));

app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("MongoDB Connected");
})
.catch((err) => {
  console.log(err);
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Prescription API Running"
  });
});

app.use("/consultation", consultationRouter);
app.use("/doctor", doctorRouter);
app.use("/patient", patientRouter);
app.use("/prescription", prescriptionRouter);

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found"
  });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error"
  });
});

module.exports = app;