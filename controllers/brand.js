const { validationResult } = require("express-validator");
const brandModel = require("../models/brand");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// simple otp generator
const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000);
};


// ================= ADD BRAND =================

const addBrand = async (req, res) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(200).json({
        error: true,
        message: result.errors[0].msg,
      });
    }

    const { brandName, description, contactPerson, phone } = req.body;

    // Check brand name exists (case insensitive)
    const brandRegex = new RegExp(`^${brandName}$`, "i");
    const brandExists = await brandModel.findOne({ brandName: brandRegex });

    if (brandExists) {
      return res.status(200).json({
        error: true,
        message: "Brand already exists",
      });
    }

    // Check phone unique
    const phoneExists = await brandModel.findOne({ phone });
    if (phoneExists) {
      return res.status(200).json({
        error: true,
        message: "Phone number already registered",
      });
    }

    const otp = generateOtp();

    const brand = new brandModel({
      brandName,
      description,
      contactPerson,
      phone,
      otp,
    });

    await brand.save();

    return res.status(200).json({
      error: false,
      message: "Brand registered successfully",
      otp   // for postman testing
    });

  } catch (error) {
    return res.status(200).json({
      error: true,
      message: error.message,
    });
  }
};


// ================= EDIT BRAND =================
const editBrand = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { id, brandName, description, contactPerson, phone } = req.body;

    // Check duplicate brand name (ignore same id)
    const brandExists = await brandModel.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      brandName: { $regex: `^${brandName}$`, $options: "i" },
    });

    if (brandExists) {
      return res.status(200).json({
        error: true,
        message: "Brand name already exists",
      });
    }

    // Check duplicate phone
    const phoneExists = await brandModel.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      phone: phone,
    });

    if (phoneExists) {
      return res.status(200).json({
        error: true,
        message: "Phone already used by another brand",
      });
    }

    await brandModel.findByIdAndUpdate(id, {
      brandName,
      description,
      contactPerson,
      phone,
    });

    return res.status(200).json({
      message: "Successfully updated brand",
      error: false,
    });

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

// ================= EDIT BRAND DETIALS PROFILE=================



const editBrandDetails = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { brandName, description, contactPerson } = req.body;
    const { _id } = req.brand;

    const brandExists = await brandModel.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(_id) },
      brandName: { $regex: `^${brandName}$`, $options: "i" },
    });
    if (brandExists) {
      return res.status(200).json({
        error: true,
        message: "Brand name already exists",
      });
    }

    await brandModel.findByIdAndUpdate(_id, {
      brandName,
      description,
      contactPerson,
    });

    return res.status(200).json({
      error: false,
      message: "Successfully updated brand",
    });

  } catch (error) {
    return res.status(200).json({
      error: true,
      message: error.message || "Something went wrong",
    });
  }
};





const deleteBrand = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { id } = req.query;

    await brandModel.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Successfully deleted brand",
      error: false,
    });

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};







// ================= GET ALL BRANDS =================
const getAllBrands = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({
        error: true,
        message: "Admin authorization required"
      });
    }


    const brands = await brandModel.find({})
      .select('-otp')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Successfully fetched all brands",
      error: false,
      brands
    });

  } catch (error) {
    console.log("Get All Brands Error:", error);
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
};



// ================= BRAND DETAILS =================

const brandDetails = async (req, res) => {
  try {

    if (!req.brand) {
      return res.status(401).json({
        error: true,
        message: "Brand not authorized"
      });
    }

    const brand = await brandModel.findById(req.brand._id);

    return res.status(200).json({
      message: "Successfully fetched brand details",
      error: false,
      brand
    });

  } catch (error) {
    console.log("Brand Details Error:", error);
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
};

// ================= BRAND LOGIN =================

const brandLogin = async (req, res) => {
  try {
    const { phone_no } = req.body;

    const brand = await brandModel.findOne({ phone: phone_no });

    if (!brand) {
      return res.status(200).json({
        error: true,
        message: "Phone not registered",
      });
    }

    const otp = generateOtp();

    brand.otp = otp;
    await brand.save();

    return res.status(200).json({
      error: false,
      message: "OTP sent successfully",
      phone_no: brand.phone,
    });

  } catch (error) {
    return res.status(200).json({
      error: true,
      message: error.message,
    });
  }
};


// ================= RESEND OTP =================

const resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const brand = await brandModel.findOne({ phone });

    if (!brand) {
      return res.status(200).json({
        error: true,
        message: "Phone not registered",
      });
    }

    const otp = generateOtp();

    brand.otp = otp;
    await brand.save();

    return res.status(200).json({
      error: false,
      message: "OTP resent successfully",
      otp
    });

  } catch (error) {
    return res.status(200).json({
      error: true,
      message: error.message,
    });
  }
};


// ================= VERIFY OTP =================
const verifyOtp = async (req, res) => {
  try {
    const { phone_no, otp } = req.body;

    const brand = await brandModel.findOne({ phone: phone_no });

    if (!brand) {
      return res.status(200).json({
        message: "Brand is not registered",
        error: true,
      });
    }


    if ("1234" === String(otp)) {

      await brandModel.findByIdAndUpdate(brand._id, {
        otp: "",
      });

      const token = await jwt.sign(
        {
          _id: brand._id,
          name: brand.brandName,
          phone_no: phone_no
        },
        process.env.jwt_secret
      );

      return res.status(200).json({
        message: "OTP verified successfully",
        error: false,
        token
      });

    } else {
      return res.status(200).json({
        message: "Please enter valid otp",
        error: true,
      });
    }

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


module.exports = {
  addBrand,
  brandLogin,
  resendOtp,
  verifyOtp,
  brandDetails,
  getAllBrands,
  editBrand,
  deleteBrand,
  editBrandDetails,
};
