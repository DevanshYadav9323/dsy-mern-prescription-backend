const { validationResult, query } = require('express-validator');
const shopModel = require('../models/shop');
const customerModel = require('../models/customer');
const orderModel = require("../models/order");
const slotModel = require('../models/slot');
const settlementModel = require('../models/settlement');
const orderRewardBreakdownModel = require("../models/orderRewardBreakdown");
// const groupSettlementModel = require('../models/groupSettlements');
const groupSettlementModel = require("../models/groupSettlements");
const { base64Upload, sendMobileOtp, uploadFileToS3, sendMessage } = require('../lib/helper');
const { mongoose } = require('mongoose');
const { default: axios } = require('axios');
const ObjectId = mongoose.Types.ObjectId;
const jwt = require("jsonwebtoken");
const QRCode = require('qrcode');
const groupSettlements = require('../models/groupSettlements');
const dayjs = require('dayjs');
const redeemReq = require('../models/redeemReq');

const shopsListing = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { page, limit } = req.query
    let skip = (page - 1) * limit
    const shopData = await shopModel.find({
      is_dark: { $ne: true }
    }).skip(skip).limit(limit)
    const slotData = await slotModel.find()
    return res.status(200).json({ message: 'Successfully fetched data', error: false, shopData, slotData })
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}

const shopsListingAdmin = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const shopData = await shopModel.find({}).sort({ createdAt: "desc" })
    const slotData = await slotModel.find()
    return res.status(200).json({ message: 'Successfully fetched data', error: false, shopData, slotData })
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}

const addShop = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { shop_name, street, zip_code, city, state, rewards, shop_logo, phone_numbers, milestone_rewards, shop_description, milestone_description, new_user_rewards,is_dark, summary_time } = req.body
    const url = await base64Upload(`shops`, `${shop_name}.jpeg`, "image/jpeg", shop_logo)
    const shopRegex = new RegExp(shop_name, "i")
    const shopExists = await shopModel.findOne({ shop_name: shopRegex })
    if (shopExists) {
      return res.status(200).json({ error: true, message: 'Shop already exists' })
    }


    // Phone numbers check

    const cleanedNumbers = (phone_numbers || []).map(p =>
      String(p.number).replace(/\D/g, "")
    );
    
    const existingPhone = await shopModel.findOne({
      "phone_numbers.number": { $in: cleanedNumbers }
    }).select("shop_name phone_numbers");
    
    if (existingPhone) {
      // find which number matched (optional but better)
      const matchedNumber = existingPhone.phone_numbers.find(p =>
        cleanedNumbers.includes(p.number)
      )?.number;
    
      return res.status(200).json({
        error: true,
        message: `Phone number ${matchedNumber} already exists in shop "${existingPhone.shop_name}"`,
      });
    }


    const { data } = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${shop_name},${street},${zip_code},${city},${state}&key=AIzaSyDbHc77zhb_hJq6J6eS7jVtusHgL6rBCq8`)

    console.log("shop data : ", data);

    const shop = new shopModel({
      shop_name: shop_name,
      street: street,
      zip_code: zip_code,
      city: city,
      state: state,
      rewards: rewards,
      shop_rating: 0,
      shop_logo: url,

      shop_description,          
      milestone_description,

      phone_numbers: phone_numbers || [],
      milestone_rewards: milestone_rewards,
      latitude: data && data.results && data.results[0] && data.results[0].geometry && data.results[0].geometry.location && data.results[0].geometry.location.lat ? data.results[0].geometry.location.lat : "",
      longitude: data && data.results && data.results[0] && data.results[0].geometry && data.results[0].geometry.location && data.results[0].geometry.location.lng ? data.results[0].geometry.location.lng : "",

      location: {
        type: "Point",
        coordinates: [
          data?.results?.[0]?.geometry?.location?.lng || 0,
          data?.results?.[0]?.geometry?.location?.lat || 0
        ]
      },

      new_user_rewards: new_user_rewards || [],
      is_dark: is_dark === true ? true : false,
      summary_time: typeof summary_time === "string" ? summary_time : "",

    })
    const newShop = await shop.save()
    const apiUrl = `https://stagingapi.shopkya.in/shop/verify_code?shop=${newShop._id}`; // replace with your API

    const qrDataUrl = await QRCode.toDataURL(apiUrl, {
      color: {
        dark: '#000',  // Black QR dots
        light: '#FFF'  // White background
      }
    })
    const base64Data = qrDataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const qrS3Url = await base64Upload(`shops`, `${shop_name}QR.jpeg`, "image/jpeg", base64Data)
    await shopModel.findByIdAndUpdate(newShop._id, { qrUrl: qrS3Url })
    return res.status(200).json({ message: 'Successfully saved your shop', error: false })
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}

const editShop = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const {
      id,
      shop_name,
      street,
      zip_code,
      city,
      state,
      rewards,
      shop_rating,
      shop_logo,
      phone_numbers,
      milestone_rewards,
      shop_description, 
      milestone_description,

      new_user_rewards,
      is_dark,
      summary_time,

    } = req.body;
    const shopExists = await shopModel.findOne({
      _id: { $ne: new ObjectId(id) },
      shop_name: { $regex: `^${shop_name}$`, $options: 'i' },
    });
    if (shopExists) {
      return res
        .status(200)
        .json({ error: true, message: "Shop already exists" });
    }


    // Phone numbers check

    const cleanedNumbers = (phone_numbers || []).map(p =>
      String(p.number).replace(/\D/g, "")
    );
    
    const existingPhone = await shopModel.findOne({
      _id: { $ne: new ObjectId(id) },
      "phone_numbers.number": { $in: cleanedNumbers }
    }).select("shop_name phone_numbers");
    
    if (existingPhone) {
      const matchedNumber = existingPhone.phone_numbers.find(p =>
        cleanedNumbers.includes(p.number)
      )?.number;
    
      return res.status(200).json({
        error: true,
        message: `Phone number ${matchedNumber} already exists in shop "${existingPhone.shop_name}"`,
      });
    }

    let url = shop_logo;

    if (
      shop_logo &&
      !shop_logo.includes("https://s3.ap-south-1.amazonaws.com/")
    ) {
      url = await base64Upload(
        `shops`,
        `${shop_name.replace(/\s+/g, "")}.jpeg`,
        "image/jpeg",
        shop_logo
      );
    }

    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${shop_name},${street},${zip_code},${city},${state}&key=AIzaSyB-O9JNkD_MeknPdgDZ_WU69RXsXyvoZP4`
    );
    const shop = await shopModel.findByIdAndUpdate(id, {
      shop_name: shop_name,
      street: street,
      zip_code: zip_code,
      city: city,
      state: state,
      rewards: rewards,
      milestone_rewards: milestone_rewards,
      // shop_rating:shop_rating,
      shop_logo: url,

      shop_description: shop_description,          
      milestone_description: milestone_description,

      phone_numbers: phone_numbers || [],
      latitude: data?.results[0]?.geometry?.location?.lat,
      longitude: data?.results[0]?.geometry?.location?.lng,


      location: {
        type: "Point",
        coordinates: [
          data?.results?.[0]?.geometry?.location?.lng || 0,
          data?.results?.[0]?.geometry?.location?.lat || 0
        ]
      },

      new_user_rewards: new_user_rewards || [],
      is_dark: is_dark === true ? true : false,
      summary_time: typeof summary_time === "string" ? summary_time : "",

    });
    return res
      .status(200)
      .json({ message: "Successfully updated your shop", error: false });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}

const editShopDetails = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { shop_name, street, zip_code, city, state, phone_no } = req.body
    const { _id } = req.shop
    const shopRegex = new RegExp(shop_name, "i")
    const shopExists = await shopModel.findOne({ _id: { $ne: new ObjectId(_id) }, shop_name: shopRegex })
    if (shopExists) {
      return res.status(200).json({ error: true, message: 'Shop already exists' })
    }
    const { data } = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${shop_name},${street},${zip_code},${city},${state}&key=AIzaSyB-O9JNkD_MeknPdgDZ_WU69RXsXyvoZP4`)
    const shop = await shopModel.findByIdAndUpdate(_id, {
      shop_name: shop_name,
      street: street,
      zip_code: zip_code,
      city: city,
      state: state,
      // shop_rating:shop_rating,
      phone_no: phone_no,
      latitude: data?.results[0]?.geometry?.location?.lat,
      longitude: data?.results[0]?.geometry?.location?.lng,


      location: {
        type: "Point",
        coordinates: [
          data?.results?.[0]?.geometry?.location?.lng || 0,
          data?.results?.[0]?.geometry?.location?.lat || 0
        ]
      }

    })
    return res.status(200).json({ message: 'Successfully updated your shop', error: false })
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}

const deleteShop = async (req, res) => {
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
    await shopModel.findByIdAndDelete(id)
    return res.status(200).json({ message: 'Successfully deleted shop', error: false })
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}

// Look up a shop by an incoming login phone number. Prefers the new
// phone_numbers array (entry must have is_login: true); falls back to the
// legacy top-level phone_no field for shops created before the migration.
const findShopByLoginPhone = async (rawPhone) => {
  const cleaned = String(rawPhone || "").replace(/\D/g, "");
  if (!cleaned) return null;
  const byArray = await shopModel.findOne({
    phone_numbers: { $elemMatch: { number: cleaned, is_login: true } },
  });
  if (byArray) return byArray;
  return shopModel.findOne({ phone_no: cleaned });
};

const shopLogin = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { phone_no } = req.body
    const registeredShop = await findShopByLoginPhone(phone_no)
    if (!registeredShop) {
      return res.status(200).json({ error: true, message: "Phone number is not registered to any shop" })
    }
    const otp = await sendMobileOtp();
    // sendMessage(`Hello,\n\nOTP to login to your ShopKya account is ${otp}. Valid only once for 15 minutes. -ShopKya`, [phone_no], otp)
    await shopModel.updateOne({ _id: registeredShop._id }, { otp });

    return res.status(200).json({
      message: "OTP sent successful",
      error: false,
      phone_no,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
}

const resendShopOtp = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { phone_no } = req.body;
    const registeredShop = await findShopByLoginPhone(phone_no);
    if (!registeredShop) {
      return res.status(200).json({
        message: "Phone number is not registered with any shop",
        error: true,
      });
    }
    const otp = await sendMobileOtp();
    // sendMessage(`Hello,\n\nOTP to login to your ShopKya account is ${otp}. Valid only once for 15 minutes. -ShopKya`, [phone_no], otp)
    await shopModel.updateOne({ _id: registeredShop._id }, { otp });

    return res.status(200).json({
      message: "OTP sent successful",
      error: false,
      phone_no,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { phone_no, otp } = req.body;
    const registeredShop = await findShopByLoginPhone(phone_no);

    if (!registeredShop) {
      return res.status(200).json({
        message: "Shop is not registered",
        error: true,
      });
    }

    // if (String(registeredShop.otp) === String(otp)) {//String(foundCustomer.otp) 
    if ("1234" === String(otp)) {
      const shopData = await shopModel
        .findByIdAndUpdate(registeredShop._id, {
          otp: "",
        })
        .exec();
      const token = await jwt.sign(
        {
          _id: registeredShop._id,
          name: registeredShop.shop_name,
          phone_no: phone_no,
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

const verifyQR = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { shop } = req.query
    const registeredShop = await shopModel.findById(shop).select("shop_name shop_logo street city state zip_code")
    if (!registeredShop) {
      return res.status(200).json({
        message: "Invalid QR code",
        error: true,
      });
    }

    const shopData = {
      _id: registeredShop._id,
      shop_name: registeredShop.shop_name,
      shop_logo: registeredShop.shop_logo,
      address: {
        street: registeredShop.street,
        city: registeredShop.city,
        state: registeredShop.state,
        zip_code: registeredShop.zip_code,
      },
    };

    return res.status(200).json({
      message: "Succesfully fetched shop",
      error: false,
      shopData
    });

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const listSettlements = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { _id } = req.shop;

    const settlements = await settlementModel
      .find({ shop_id: _id })
      .populate("shop_id", ["shop_name"])
      .populate("customer_id", ["first_name", "last_name"])
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Successfully fetched settlements",
      error: false,
      settlements: settlements,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


const listSettlementsAdmin = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { shop_id, status } = req.query
    const settlements = await settlementModel.find({ shop_id, status }).populate("shop_id", ["shop_name"]).populate("customer_id", ["first_name", "last_name", "name"]).sort({ createdAt: -1 });
    return res.status(200).json({ message: "Successfully fetched settlements", error: false, settlements })

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const settleSettlements = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { ids } = req.body;
    const settlements = await settlementModel.find({ _id: { $in: ids } })

    if (settlements.length === 0) {
      return res.status(200).json({ error: true, message: "No settlements found for given ids" });
    }

    const shopIds = new Set(settlements.map((s) => String(s.shop_id)));
    if (shopIds.size !== 1) {
      return res.status(200).json({ error: true, message: "All settlements must belong to the same shop" });
    }
    const shop_id = settlements[0].shop_id;

    let total_coins = 0;
    let total_amount = 0;
    const redeems = [];
    const settled_on = new Date();

    for (let settlement of settlements) {

      total_coins += settlement.coins;
      total_amount += settlement.coins / 100;

      redeems.push({
        customer_id: settlement.customer_id,
        redeem_id: settlement.redeem_id,
      });

      // Mark as settled
      await settlementModel.findByIdAndUpdate(settlement._id, {
        status: "settled",
        settled_on,
      });
    }

    // Create a new group (ALWAYS create new group for each batch)
    await groupSettlementModel.create({
      shop_id,
      settled_on,
      total_coins,
      total_amount,
      redeems,
    });

    return res.status(200).json({
      error: false,
      message: "Successfully updated all the settlements",
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const listSettlementGroups = async (req, res) => {
  try {
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({
        error: true,
        title: result.errors[0].msg,
        errors: result.array(),
      });
    }

    const groups = await groupSettlementModel
      .find({ shop_id: req.shop._id })
      .sort({ createdAt: -1 })
      .populate({
        path: 'redeems.customer_id',
        select: 'first_name last_name'
      })
      .populate({
        path: 'redeems.redeem_id',
        select: 'coins createdAt'
      })
      .lean();

    const formattedGroups = groups.map(group => ({
      _id: group._id,
      settled_on: group.settled_on,
      total_coins: group.total_coins,
      total_amount: group.total_amount,
      redeems: group.redeems.map(redeem => ({
        customer_id: redeem.customer_id?._id,
        customer_name: redeem.customer_id?.first_name + " " + redeem.customer_id?.last_name,
        coins: redeem.redeem_id?.coins || 0,
        amount: (redeem.redeem_id?.coins || 0) / 100,
        redeemed_date: redeem.redeem_id?.createdAt
          ? new Date(redeem.redeem_id.createdAt)
          : ""
      }))
    }));

    return res.status(200).json({
      error: false,
      message: "Fetched settlement groups successfully",
      data: formattedGroups
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: true,
      message: error.message || "Something went wrong while fetching settlement groups"
    });
  }
};



const shopDetails = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { _id } = req.shop
    const shop = await shopModel.findById(_id)
    return res.status(200).json({ message: "Sucessfully fetched shop details", error: false, shop })
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const getMilestoneProgress = async (req, res) => {
  try {

    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({
        error: true,
        title: result.errors[0].msg,
        errors: result.array(),
      });
    }

    const { shop_id } = req.query;
    const { _id } = req.user;

    if (!shop_id) {
      return res.status(200).json({ error: true, message: "Shop_id is required" });
    }

    const now = dayjs();
    const currentMonth = now.format("MMMM").toLowerCase();
    const currentYear = now.format("YYYY");

    // Get customer spent amount for this shop this month
    const customer = await customerModel.findById(_id);
    const spent = customer.spent_amount.find(
      entry =>
        String(entry.shop_id) === String(shop_id) &&
        entry.month === currentMonth &&
        entry.year === currentYear
    );

    const currentAmount = spent ? spent.amount : 0;

    // Get shop milestone rewards
    const shop = await shopModel.findById(shop_id);

    if (!shop) {
      return res.status(404).json({ error: true, message: "Shop not found" });
    }

    const milestones = shop.milestone_rewards.sort((a, b) => a.amount - b.amount);

    // Figure out next milestone
    let nextMilestone = null;
    for (const milestone of milestones) {
      if (milestone.amount > currentAmount) {
        nextMilestone = milestone;
        break;
      }
    }

    res.status(200).json({
      error: false,
      message: "Milestone Progress fetched successfully",
      shop_id,
      customer_id: _id,
      currentMonth,
      currentYear,
      currentAmount,
      nextMilestone: nextMilestone
        ? {
          targetAmount: nextMilestone.amount,
          reward: nextMilestone.reward,
          amountRemaining: nextMilestone.amount - currentAmount,
        }
        : null,
      milestonesAchieved: milestones
        .filter(m => m.amount <= currentAmount)
        .map(m => ({
          targetAmount: m.amount,
          reward: m.reward,
        })),
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: true, message: err.message });
  }
};

const listOfferDetails = async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({
        error: true,
        message: "Month is required (format YYYY-MM)",
      });
    }

    const shopId = req.shop?._id;
    if (!shopId) {
      return res.status(403).json({
        error: true,
        message: "Unauthorized: Shop not found",
      });
    }

    const [year, monthNum] = month.split("-");
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    // const maskName = (first, last) => {
    //   const full = `${first || ""} ${last || ""}`.trim();
    //   if (!full) return "-";
    //   return full
    //     .split(" ")
    //     .map((p) => p[0] + "*".repeat(Math.max(0, p.length - 1)))
    //     .join(" ");
    // };

    const records = await orderRewardBreakdownModel
      .find({
        shop_id: shopId,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate("customer_id", "first_name last_name spent_amount")
      .populate("order_id", "invoice_no invoice_date")
      .lean();

    const shop = await shopModel.findById(shopId).lean();
    const milestoneList = [...(shop?.milestone_rewards || [])].sort(
      (a, b) => a.amount - b.amount
    );

    const grouped = {};

    records.forEach((rec) => {
      const cust = rec.customer_id;
      if (!cust?._id) return;

      const custId = cust._id.toString();

      if (!grouped[custId]) {
        grouped[custId] = {
          name: `${cust.first_name || ""} ${cust.last_name || ""}`.trim(),
          milestones: 0,
          total_amount: 0,
          total_rewards: 0,
          biggest_milestone_hit: "",
          biggest_milestone_reward: "",
          history: [],
          previous_cumulative: 0,
        };
      }

      const g = grouped[custId];

      const amountSpent = rec.amount_spent || 0;

      g.total_amount += amountSpent;

      const previousSpent = g.previous_cumulative;
      const newTotalSpent = previousSpent + amountSpent;

      const newlyAchieved = milestoneList.filter(
        (m) => m.amount > previousSpent && m.amount <= newTotalSpent
      );

      let milestoneRewardToGive = 0;
      let hitMilestone = null;

      if (newlyAchieved.length > 0) {
        const prevReward =
          milestoneList.filter((m) => m.amount <= previousSpent).pop()?.reward ||
          0;

        hitMilestone = newlyAchieved.slice(-1)[0];
        const newTopReward = hitMilestone.reward;

        milestoneRewardToGive = newTopReward - prevReward;

        g.milestones += 1;

        if (
          g.biggest_milestone_reward === "" ||
          milestoneRewardToGive > g.biggest_milestone_reward
        ) {
          g.biggest_milestone_hit = hitMilestone.amount;
          g.biggest_milestone_reward = milestoneRewardToGive;
        }
      }

      // History entry
      g.history.push({
        date: rec.createdAt,
        invoice_no: rec.order_id?.invoice_no || "",
        invoice_date: rec.order_id?.invoice_date || "",
        amount: amountSpent,
        milestone: hitMilestone ? hitMilestone.amount : "",
        rewards: milestoneRewardToGive || (hitMilestone ? 0 : ""),
      });

      if (milestoneRewardToGive > 0) {
        g.total_rewards += milestoneRewardToGive;
      }

      g.previous_cumulative = newTotalSpent;
    });

    const responseList = Object.values(grouped).map((g) => {
      delete g.previous_cumulative;

      return {
        ...g,
        biggest_milestone_hit: g.biggest_milestone_hit || "",
        biggest_milestone_reward: g.biggest_milestone_reward || "",
      };
    });

    responseList.sort((a, b) => {
      const da = a.history?.[0]?.date || "";
      const db = b.history?.[0]?.date || "";
      return new Date(db) - new Date(da);
    });

    const totalCustomers = responseList.length;
    let totalCustomersHit = 0;
    let totalCoinsEarned = 0;
    let customersCompletedAll = 0;

    const allRegisteredCustomers = await customerModel.countDocuments();

    responseList.forEach((c) => {
      if (c.milestones > 0) totalCustomersHit += 1;
      totalCoinsEarned += c.total_rewards || 0;
      if (
        milestoneList.length > 0 &&
        c.biggest_milestone_hit === milestoneList[milestoneList.length - 1].amount
      ) {
        customersCompletedAll += 1;
      }
    });

    // Progress bar data

    const milestoneProgress = milestoneList.map((m) => {
      return {
        amount: m.amount,
        reward: m.reward,
        customers_completed: responseList.filter(
          (c) => c.biggest_milestone_hit >= m.amount
        ).length,
      };
    });

    const result = await redeemReq.aggregate([
      {
        $match: {
          shop_id: shopId,
          status: "fulfilled",
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total_coins_due: { $sum: "$coins" }
        }
      }
    ]);

    const total_coins_due = result[0]?.total_coins_due || 0;
    const stats = {
      total_customers_hit: totalCustomersHit,
      total_coins_earned: totalCoinsEarned,
      total_amount_earned: totalCoinsEarned / 100,
      participation_percentage: totalCustomers
        ? Math.round((totalCustomersHit / allRegisteredCustomers) * 100)
        : 0,
      completion_percentage: totalCustomers
        ? Math.round((customersCompletedAll / totalCustomersHit) * 100)
        : 0,
      total_due_coins: total_coins_due,
      total_due_amount: total_coins_due / 100
    };




    return res.status(200).json({
      error: false,
      message: "Fetched offer details successfully",
      data: responseList,
      stats,
      milestoneProgress
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: true,
      message: err.message || "Something went wrong",
    });
  }
};

const listShopAmountReport = async (req, res) => {
  try {
    const { month, timeRange = "monthly", user } = req.query;

    const shopId = req.shop?._id;
    if (!shopId) {
      return res.status(403).json({ error: true, message: "Unauthorized" });
    }

    /* ---------------- DATE RANGE ---------------- */
    let startDate, endDate;
    const now = new Date();

    if (timeRange === "monthly") {
      if (!month) {
        return res.status(400).json({ error: true, message: "Month required" });
      }
      const [y, m] = month.split("-");
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59);
    }

    if (timeRange === "quarterly") {
      startDate = new Date(new Date().setMonth(now.getMonth() - 3));
      endDate = new Date();
    }

    if (timeRange === "half-yearly") {
      startDate = new Date(new Date().setMonth(now.getMonth() - 6));
      endDate = new Date();
    }

    if (timeRange === "yearly") {
      startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
      endDate = new Date();
    }

    /* ---------------- AGGREGATION ---------------- */
    const pipeline = [
      {
        $match: {
          shop_id: shopId,
          order_status: "completed",
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },

      /* ---- JOIN CUSTOMER ---- */
      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      /* ---- USER SEARCH ---- */
      ...(user
        ? [{
          $match: {
            $or: [
              { "customer.first_name": { $regex: user, $options: "i" } },
              { "customer.last_name": { $regex: user, $options: "i" } },
            ],
          },
        }]
        : []),

      /* ---- JOIN REWARD BREAKDOWN ---- */
      {
        $lookup: {
          from: "order_reward_breakdowns",
          localField: "_id",
          foreignField: "order_id",
          as: "reward",
        },
      },
      { $unwind: "$reward" },

      /* ---- GROUP BY CUSTOMER ---- */
      {
        $group: {
          _id: "$customer._id",

          name: {
            $first: {
              $concat: ["$customer.first_name", " ", "$customer.last_name"],
            },
          },

          visits: { $sum: 1 },

          /* ✅ AMOUNT SPENT */
          total_amount: { $sum: "$reward.amount_spent" },

          /* ✅ TOTAL SHOP REWARDS */
          total_rewards: { $sum: "$reward.order_rewards.shop_reward" },

          history: {
            $push: {
              invoice_no: "$invoice_no",
              invoice_date: "$invoice_date",
              scan_date: "$createdAt",

              /* ✅ ORDER AMOUNT */
              amount: "$reward.amount_spent",

              /* ✅ SHOP OFFER AMOUNT */
              shop_offer: {
                $sum: "$reward.shop_hits.amount",
              },

              /* ✅ REWARDS EARNED */
              rewards: "$reward.order_rewards.shop_reward",
            },
          },
        },
      },

      /* ---- REMOVE USERS WITH 0 REWARDS ---- */
      {
        $match: {
          total_rewards: { $gt: 0 },
        },
      },

      { $sort: { total_amount: -1 } },
    ];

    const table = await orderModel.aggregate(pipeline);

    /* ---------------- STATS ---------------- */
    const total_users = table.length;
    const total_visits = table.reduce((s, u) => s + u.visits, 0);
    const total_amount = table.reduce((s, u) => s + u.total_amount, 0);
    const total_rewards = table.reduce((s, u) => s + u.total_rewards, 0);

    /* ---------------- PROGRESS BAR ---------------- */
    const shop = await shopModel.findById(shopId).lean();
    let progress = null;

    if (
      Array.isArray(shop?.rewards) &&
      shop.rewards.length > 0 &&
      !(shop.rewards.length === 1 &&
        shop.rewards[0].amount === 0 &&
        shop.rewards[0].reward === 0)
    ) {
      const progressPipeline = [
        {
          $match: {
            shop_id: shopId,
            order_status: "completed",
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $lookup: {
            from: "order_reward_breakdowns",
            localField: "_id",
            foreignField: "order_id",
            as: "reward",
          },
        },
        { $unwind: "$reward" },
        { $unwind: "$reward.shop_hits" },

        /* ---- MATCH EXACT SHOP OFFER ---- */
        {
          $match: {
            "reward.shop_hits.amount": { $in: shop.rewards.map(r => r.amount) },
          },
        },

        /* ---- DISTINCT USER PER OFFER AMOUNT ---- */
        {
          $group: {
            _id: {
              amount: "$reward.shop_hits.amount",
              customer: "$customer_id",
            },
          },
        },

        /* ---- COUNT USERS ---- */
        {
          $group: {
            _id: "$_id.amount",
            users_completed: { $sum: 1 },
          },
        },
      ];

      const progressData = await orderModel.aggregate(progressPipeline);

      const progressMap = {};
      progressData.forEach(p => {
        progressMap[p._id] = p.users_completed;
      });

      progress = shop.rewards
        .sort((a, b) => a.amount - b.amount)
        .map(r => ({
          amount: r.amount,
          reward: r.reward,
          users_completed: progressMap[r.amount] || 0,
        }));
    }

    const result = await redeemReq.aggregate([
      {
        $match: {
          shop_id: shopId,
          status: "fulfilled",
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          total_coins: { $sum: "$coins" }
        }
      }
    ])
    console.log(result)
    const total_due = result[0]?.total_coins || 0;

    return res.status(200).json({
      error: false,
      message: "Shop amount report fetched",
      stats: {
        total_users,
        total_visits,
        total_amount,
        total_rewards,
        total_due
      },
      progress,
      table,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: true,
      message: err.message || "Something went wrong",
    });
  }
};


const offerRedeemReportForShop = async (req, res) => {
  try {
    const { offer_id } = req.query;

    if (!offer_id) {
      return res.status(200).json({
        error: true,
        message: "offer_id is required",
      });
    }

    const shopId = req.shop._id;
    const offerId = new mongoose.Types.ObjectId(offer_id);

    const report = await orderRewardBreakdownModel.aggregate([

      {
        $match: {
          shop_id: new mongoose.Types.ObjectId(shopId),
        },
      },

      { $unwind: "$offers" },

      {
        $match: {
          "offers.offer_id": offerId,
        },
      },
      {
        $lookup: {
          from: "orders",
          localField: "order_id",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: "$order" },

      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },

      {
        $lookup: {
          from: "products",
          localField: "offers.product_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "categories",
          localField: "product.category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $unwind: {
          path: "$category",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $group: {
          _id: "$customer._id",
          first_name: { $first: "$customer.first_name" },
          last_name: { $first: "$customer.last_name" },
          total_redeem: { $sum: 1 },
          total_rewards: { $sum: "$offers.reward" },

          history: {
            $push: {
              invoice_no: "$order.invoice_no",
              invoice_date: "$order.invoice_date",
              scan_date: "$order.createdAt",

              product_name: "$product.product_name",
              category: "$category.category",

              amount: "$amount_spent",
              reward: "$offers.reward",
            },
          },
        },
      },

      {
        $sort: { total_redeem: -1 },
      },
    ]);

    return res.status(200).json({
      error: false,
      data: report,
    });
  } catch (error) {
    return res.status(200).json({
      error: true,
      message: error.message,
    });
  }
};



module.exports = {
  shopsListing,
  addShop,
  deleteShop,
  shopsListingAdmin,
  editShop,
  shopLogin,
  resendShopOtp,
  verifyOtp,
  verifyQR,
  listSettlements,
  listSettlementsAdmin,
  settleSettlements,
  shopDetails,
  editShopDetails,
  listSettlementGroups,
  getMilestoneProgress,
  listOfferDetails,
  listShopAmountReport,
  offerRedeemReportForShop
};