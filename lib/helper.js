const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const PDFDocument =
  require("pdfkit");

const fs =
  require("fs");

const path =
  require("path");

const generateToken = (_id) => {

    return jwt.sign(
        { _id },
        process.env.jwt_secret,
        {
            expiresIn: "30d"
        }
    );

};

const hashPassword = async (password) => {

    const salt = await bcrypt.genSalt(10);

    return bcrypt.hash(password, salt);

};

const comparePassword = async (
    password,
    hashedPassword
) => {

    return bcrypt.compare(
        password,
        hashedPassword
    );

};

const successResponse = (
    res,
    message,
    data = null
) => {

    return res.status(200).json({
        error: false,
        message,
        data
    });

};

const errorResponse = (
    res,
    message
) => {

    return res.status(400).json({
        error: true,
        message
    });

};


// const generatePrescriptionPDF =
//   async (
//     prescription,
//     patient,
//     doctor
//   ) => {

//   return new Promise(
//     (resolve, reject) => {

//     try {

//       const pdfName =
//         `prescription-${Date.now()}.pdf`;

//       const pdfPath =
//         path.join(
//           __dirname,
//           "../uploads",
//           pdfName
//         );

//       const doc =
//         new PDFDocument();

//       const stream =
//         fs.createWriteStream(
//           pdfPath
//         );

//       doc.pipe(stream);

//       doc.fontSize(24)
//       .text(
//         "Medical Prescription",
//         {
//           align: "center"
//         }
//       );

//       doc.moveDown();

//       doc.fontSize(16)
//       .text(
//         `Doctor: Dr. ${doctor.name}`
//       );

//       doc.text(
//         `Specialty: ${doctor.specialty}`
//       );

//       doc.moveDown();

//       doc.text(
//         `Patient: ${patient.name}`
//       );

//       doc.text(
//         `Age: ${patient.age}`
//       );

//       doc.moveDown();

//       doc.text(
//         "Care To Be Taken:"
//       );

//       doc.moveDown(0.5);

//       doc.fontSize(14)
//       .text(
//         prescription.careToBeTaken
//       );

//       doc.moveDown();

//       doc.fontSize(16)
//       .text(
//         "Medicines:"
//       );

//       doc.moveDown(0.5);

//       doc.fontSize(14)
//       .text(
//         prescription.medicines
//       );

//       doc.moveDown(2);

//       doc.text(
//         `Generated on: ${new Date().toLocaleString()}`
//       );

//       doc.end();

//       stream.on(
//         "finish",
//         () => {

//         resolve({
//           pdfName,
//           pdfPath
//         });

//       });

//     } catch (error) {

//       reject(error);

//     }

//   });

// };


const generatePrescriptionPDF =
  async (
    prescription,
    patient,
    doctor
  ) => {

  return new Promise(
    async (
      resolve,
      reject
    ) => {

    try {

      let pdfName;

      if (
        prescription.pdfUrl
      ) {

        pdfName =
          prescription.pdfUrl
          .split("/")
          .pop();

      } else {

        pdfName =
          `prescription-${Date.now()}.pdf`;

      }

      const pdfPath =
        path.join(
          __dirname,
          "../uploads",
          pdfName
        );

      const doc =
        new PDFDocument({

          margin: 30,

          size: "A4"

        });

      const stream =
        fs.createWriteStream(
          pdfPath
        );

      doc.pipe(stream);

      /* HEADER */

      doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text(
        `Dr. ${doctor.name}`,
        30,
        30
      );

      doc
      .fontSize(12)
      .font("Helvetica")
      .text(
        `Specialty: ${doctor.specialty}`,
        30,
        55
      );

      doc
      .text(
        `Patient: ${patient.name}`,
        30,
        75
      );

      doc
      .text(
        `Age: ${patient.age}`,
        30,
        95
      );

      doc
      .text(
        `Date: ${new Date().toLocaleDateString()}`,
        400,
        30
      );

      /* BLUE LINE */

      doc
      .rect(
        0,
        130,
        700,
        10
      )
      .fill("#0D1B7E");

      /* CARE SECTION */

      doc
      .fillColor("black")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(
        "Care to be taken",
        30,
        170
      );

      doc
      .rect(
        30,
        200,
        530,
        120
      )
      .stroke();

      doc
      .fontSize(13)
      .font("Helvetica")
      .text(

        prescription
        .careToBeTaken,

        45,
        220,

        {
          width: 500
        }

      );

      /* MEDICINES */

      doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text(
        "Medicines",
        30,
        360
      );

      doc
      .rect(
        30,
        390,
        530,
        180
      )
      .stroke();

      doc
      .fontSize(13)
      .font("Helvetica")
      .text(

        prescription
        .medicines,

        45,
        410,

        {
          width: 500
        }

      );

      /* BOTTOM BLUE BAR */

      doc
      .rect(
        0,
        620,
        700,
        10
      )
      .fill("#0D1B7E");

      /* SIGNATURE */

      doc
      .fillColor("black")
      .fontSize(14)
      .font("Helvetica")
      .text(
        `Dr. ${doctor.name}`,
        420,
        720
      );

      doc.end();

      stream.on(
        "finish",
        () => {

        resolve({

          pdfName,

          pdfPath

        });

      });

    } catch (error) {

      reject(error);

    }

  });

};


module.exports = {
    generateToken,
    hashPassword,
    comparePassword,
    successResponse,
    errorResponse,
    generatePrescriptionPDF
};
