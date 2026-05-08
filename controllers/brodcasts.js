const { validationResult } = require("express-validator");
const broadcastModel = require("../models/broadcast");
const customerModel = require("../models/customer");
const shopModel = require("../models/shop");
const productModel = require("../models/product");
const orderModel = require("../models/order");
const companyModel = require("../models/company");
const { sendPushNotification } = require("../lib/helper");
const { sendImmediateBroadcast } = require("../cron/broadcastCron");
const category = require("../models/category");
const dayjs = require("dayjs");


const createBroadcast = async (req, res) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result.array(),
      });
    }

    let {
      title,
      message,
      broadcast_date,
      broadcast_time,
      target,
      shop,
      brand,
      category,
      product,
      is_scheduled,
      send_now,
    } = req.body;

    // parse boolean properly (frontend sends true/false or "true"/"false")
    const isScheduledBool = is_scheduled === true || is_scheduled === "true";

    let broadcastDay = null;

    if (isScheduledBool) {
      broadcastDay = dayjs(broadcast_date);

      if (!broadcastDay.isValid()) {
        return res.status(200).json({
          error: true,
          title: "Invalid date",
        });
      }

      const startOfDay = broadcastDay.startOf("day").toDate();
      const endOfDay = broadcastDay.endOf("day").toDate();

      const existingBroadcast = await broadcastModel.findOne({
        broadcast_time,
        broadcast_date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (existingBroadcast) {
        return res.status(200).json({
          error: true,
          broadcast_title: existingBroadcast.title,
          message: "A broadcast is already scheduled for this date and time",
        });
      }
    }

    brand = brand && brand.trim() !== "" ? brand : undefined;
    category = category && category.trim() !== "" ? category : undefined;
    product = product && product.trim() !== "" ? product : undefined;

    const newBroadcast = new broadcastModel({
      title,
      message,
      broadcast_date: isScheduledBool ? broadcastDay.toDate() : null,
      broadcast_time: isScheduledBool ? broadcast_time : null,
      target,
      shop,
      brand,
      category,
      product,
      is_scheduled: isScheduledBool,
      send_now: !isScheduledBool,
      status: isScheduledBool ? "scheduled" : "pending",
    });

    await newBroadcast.save();

    // if not scheduled, fire push notification immediately
    if (!isScheduledBool) {
      await sendImmediateBroadcast(newBroadcast._id);
    }

    return res.status(200).json({
      error: false,
      message: "Successfully created a broadcast",
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const getAllBroadcast = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(400).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const broadcasts = await broadcastModel
      .find()
      .populate("brand", ["company_name"])
      .populate("product", ["product_name"])
      .populate("target", ["first_name", "last_name", "email", "phone_no"])
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Successfully fetched all Broadcast data",
      error: false,
      broadcasts
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


const getAllData = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(400).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const shops = await shopModel.find({});
    const categories = await category.find({});
    const companies = await companyModel.find({});

    return res.status(200).json({
      message: "Successfully fetched all data",
      error: false,
      shops,
      categories,
      companies,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const { brand, category, subcategory } = req.body;
    const query = {};
    if (brand) query.company_id = brand;
    if (category) query.category_id = category;
    if (subcategory) query.subcategory = subcategory;

    const products = await productModel
      .find(query, ["product_name", "company_id", "category_id", "subcategory"])
      .populate("company_id", "company_name")
      .populate("category_id", "category");

    return res.status(200).json({
      error: false,
      products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await customerModel.find(
      { is_first_time: false },
      ["first_name", "last_name", "email", "phone_no"]
    );

    return res.status(200).json({
      error: false,
      customers,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const filterCustomers = async (req, res) => {
  try {
    const { shop, brand, product, category, subcategory } = req.body;

    let orderQuery = {};

    // Outside order_details
    if (shop) {
      orderQuery.shop = shop;
    }

    let orderDetailsConditions = {};

    // Direct product filter
    if (product) {
      orderDetailsConditions.product_id = product;
    }

    // Brand filter
    if (brand) {
      orderDetailsConditions.company_id = brand;
    }

    // Category + Subcategory filter (only if product is not given)
    if (!product && (category || subcategory)) {
      const productQuery = {};
      if (category) productQuery.category_id = category;
      if (subcategory) productQuery.subcategory = subcategory;

      const matchingProducts = await productModel.find(productQuery, "_id");
      const productIds = matchingProducts.map((p) => p._id);

      if (productIds.length === 0) {
        return res.status(200).json({
          message: "No products found for this category/subcategory",
          error: false,
          filteredCustomers: [],
        });
      }

      orderDetailsConditions.product_id = { $in: productIds };
    }

    if (Object.keys(orderDetailsConditions).length > 0) {
      orderQuery.order_details = { $elemMatch: orderDetailsConditions };
    }

    const orders = await orderModel
      .find(orderQuery)
      .populate("customer_id", ["first_name", "last_name", "email", "phone_no"]);

    const uniqueCustomersMap = new Map();

    orders.forEach((order) => {
      if (
        order.customer_id &&
        !uniqueCustomersMap.has(order.customer_id._id.toString())
      ) {
        uniqueCustomersMap.set(
          order.customer_id._id.toString(),
          order.customer_id
        );
      }
    });

    const filteredCustomers = Array.from(uniqueCustomersMap.values());

    return res.status(200).json({
      message: "Filtered customers fetched successfully",
      error: false,
      filteredCustomers,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


const deleteBroadcast = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { id } = req.query
    await broadcastModel.findByIdAndDelete(id)
    return res.status(200).json({ message: 'Successfully deleted broadcast', error: false })
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}




module.exports = { createBroadcast, getAllData, getAllBroadcast, filterCustomers, deleteBroadcast, getProducts, getCustomers }