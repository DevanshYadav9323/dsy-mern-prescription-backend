const Prescription =
  require("../models/Prescription");

const Consultation =
  require("../models/Consultation");

  const Patient = require('../models/Patient');

  const fs = require("fs");
const path = require("path");

const {
  successResponse,
  errorResponse,
  generatePrescriptionPDF,
} = require("../lib/helper");



const createPrescription =
  async (req, res) => {

  try {

    const doctor =
      req.doctor;

    const {
      consultationId,
      careToBeTaken,
      medicines
    } = req.body;

    const consultation =
      await Consultation.findById(
        consultationId
      );

    if (!consultation) {

      return errorResponse(
        res,
        "Consultation not found"
      );

    }

    const patient =
      await Patient.findById(
        consultation.patient
      );

    let prescription =
      await Prescription.findOne({

        consultation:
          consultationId

      });

    /*
    ===================================
    UPDATE EXISTING PRESCRIPTION
    ===================================
    */

    if (prescription) {

      /*
      DELETE OLD PDF
      */

      if (prescription.pdfUrl) {

        const oldPdfPath =
          path.join(

            __dirname,

            "..",

            prescription.pdfUrl

          );

        if (
          fs.existsSync(oldPdfPath)
        ) {

          fs.unlinkSync(
            oldPdfPath
          );

        }

      }

      prescription.careToBeTaken =
        careToBeTaken;

      prescription.medicines =
        medicines;

      await prescription.save();

    } else {

      /*
      CREATE NEW PRESCRIPTION
      */

      prescription =
        await Prescription.create({

          consultation:
            consultationId,

          doctor:
            doctor._id,

          patient:
            consultation.patient,

          careToBeTaken,

          medicines

        });

    }

    /*
    GENERATE NEW PDF
    */

    const pdfData =
      await generatePrescriptionPDF(

        prescription,

        patient,

        doctor

      );

    prescription.pdfUrl =
      `/uploads/${pdfData.pdfName}`;

    await prescription.save();

    consultation.status =
      "Completed";

    await consultation.save();

    return successResponse(
      res,

      prescription.isNew
        ? "Prescription created successfully"
        : "Prescription updated successfully",

      prescription
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};


// const createPrescription =
//   async (req, res) => {

//   try {

//     const doctor =
//       req.doctor;

//     const {

//       consultationId,

//       careToBeTaken,

//       medicines

//     } = req.body;

//     const consultation =
//       await Consultation.findById(
//         consultationId
//       );

//     if (!consultation) {

//       return errorResponse(
//         res,
//         "Consultation not found"
//       );

//     }

//     const patient =
//       await Patient.findById(
//         consultation.patient
//       );

//     let prescription =
//       await Prescription.findOne({

//         consultation:
//           consultationId

//       });

//     /* UPDATE EXISTING */

//     if (prescription) {

//       prescription
//       .careToBeTaken =
//         careToBeTaken;

//       prescription
//       .medicines =
//         medicines;

//       await prescription.save();

//     }

//     /* CREATE NEW */

//     else {

//       prescription =
//         await Prescription.create({

//           consultation:
//             consultationId,

//           doctor:
//             doctor._id,

//           patient:
//             consultation.patient,

//           careToBeTaken,

//           medicines

//         });

//     }

//     /* GENERATE PDF */

//     const pdfData =
//       await generatePrescriptionPDF(

//         prescription,

//         patient,

//         doctor

//       );

//     prescription.pdfUrl =
//       `/uploads/${pdfData.pdfName}`;

//     await prescription.save();

//     consultation.status =
//       "Completed";

//     await consultation.save();

//     return successResponse(

//       res,

//       prescription.pdfUrl
//         ? "Prescription updated successfully"
//         : "Prescription created successfully",

//       prescription

//     );

//   } catch (error) {

//     console.log(error);

//     return errorResponse(
//       res,
//       "Something went wrong"
//     );

//   }

// };


const updatePrescription =
  async (req, res) => {

  try {

    const {
      id
    } = req.params;

    const {
      careToBeTaken,
      medicines
    } = req.body;

    const prescription =
      await Prescription.findById(id);

    if (!prescription) {

      return errorResponse(
        res,
        "Prescription not found"
      );

    }

    prescription.careToBeTaken =
      careToBeTaken;

    prescription.medicines =
      medicines;

    await prescription.save();

    return successResponse(
      res,
      "Prescription updated successfully",
      prescription
    );

  } catch (error) {

    console.log(error);

    return errorResponse(
      res,
      "Something went wrong"
    );

  }

};

const doctorPrescriptions =
  async (req, res) => {

  try {

    const doctor =
      req.doctor;

    const prescriptions =
      await Prescription.find({
        doctor: doctor._id
      })
      .populate("patient")
      .populate("consultation")
      .sort({ createdAt: -1 });

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


const getPrescriptionByConsultation =
  async (req, res) => {

  try {

    const {
      consultationId
    } = req.params;

    const prescription =
      await Prescription.findOne({

        consultation:
          consultationId

      });

    return successResponse(

      res,

      "Prescription fetched successfully",

      prescription

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
  createPrescription,
  updatePrescription,
  doctorPrescriptions,
  getPrescriptionByConsultation,
};