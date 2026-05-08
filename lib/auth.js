const customersModel = require('../models/customer')
const adminModel = require('../models/admin')
const jwt = require("jsonwebtoken");
const shop = require('../models/shop');
const brandModel = require("../models/brand");

const authenticateCustomer = async (req, res, next) => {
    try {
      const token = req.headers.token ? req.headers.token : req.query.token;
      const decoded = jwt.verify(token, process.env.jwt_secret);
        let userData = await customersModel.findById(decoded.customer_id);
        if (!userData) {
          throw new Error("Authorization required.")
        }
        req.user = userData;
        return next(null, userData);      
    } catch (error) {
      console.log(error);
      return res.status(200).json({
        title: "Authorization required.",
        error: true,
      });
    }
};

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization ? req.headers.authorization : req.query.token;
    const decoded = jwt.verify(token, process.env.jwt_secret);
    let adminData = await adminModel.findById(decoded._id);
    if (!adminData) {
      throw new Error("Authorization required.")
    }
    req.admin = adminData;
    return next(null, adminData);
  } catch (error) {
    console.log(error);
    return res.status(200).json({
      title: "Authorization required.",
      error: true,
    });
  }
};






const authenticateBrand = async (req, res, next) => {
  try {

    let token =
      req.headers.authorization || req.query.authorization;

    if (!token) {
      throw new Error("No token provided");
    }

    // ⭐ Handle Bearer token
    if (token.startsWith("Bearer ")) {
      token = token.split(" ")[1];
    }

    const decoded = jwt.verify(token, process.env.jwt_secret);

    const brandData = await brandModel.findById(decoded._id);

    if (!brandData) {
      throw new Error("Brand not found");
    }

    req.brand = brandData;

    next();

  } catch (error) {
    console.log("Auth Brand Error:", error);
    return res.status(401).json({
      error: true,
      message: "Authorization required"
    });
  }
};



const authenticateShop = async (req, res, next) => {
  try {
    const token = req.headers.authorization ? req.headers.authorization : req.query.authorization;
    const decoded = jwt.verify(token, process.env.jwt_secret);
    let shopData = await shop.findById(decoded._id);
    if (!shopData) {
      throw new Error("Authorization required.")
    }
    req.shop = shopData;
    return next(null, shopData);
  } catch (error) {
    console.log(error);
    return res.status(200).json({
      title: "Authorization required.",
      error: true,
    });
  }
};
module.exports = {
    authenticateCustomer,
    authenticateAdmin,
    authenticateShop,
    authenticateBrand,
};