const customersModel = require("../models/customer");
const {
  sendMobileOtp,
  sendEmail,
  sendMessage,
  sendReferralCode,
  sendPushNotification,
  base64Upload,
} = require("../lib/helper");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const addressModel = require("../models/address");
const redeemModel = require("../models/redeem");

const { default: axios } = require("axios");
const walletTransaction = require("../models/walletTransaction");
const shop = require("../models/shop");
const cart = require("../models/cart");
const note = require("../models/note");
const order = require("../models/order");
const query = require("../models/query");
const redeem = require("../models/redeem");
const redeemReq = require("../models/redeemReq");
const version = require("../models/version");
const QRCode = require('qrcode');
const { maintainance } = require("../models/maintainance");
const customer = require("../models/customer");
const labelModel = require("../models/label");
const offerModel = require("../models/offer");
const systemConfigModel = require("../models/systemConfig");
const orderRewardBreakdown = require("../models/orderRewardBreakdown");
const mongoose = require('mongoose');

const favouriteOffer = require("../models/favouriteOffer");
// const offerModel = require("../models/offer");
// const labelModel = require('../models/label');
const notesModel = require("../models/note")
const shopModel = require('../models/shop');
const dayjs = require('dayjs');
const backendUrlModel = require("../models/backendUrl");

const OTP_BYPASS_PHONE = "9004353155"; // <-- this phone will always use 1234 OTP
const OTP_BYPASS_OTP = "1234";






const login = async (req, res) => {
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
    // const otp = await sendMobileOtp();
    const customerData = await customersModel.findOne({ phone_no });
    if(customerData && customerData.is_disabled == true){
      return res.status(200).json({error:true, message:"This account has been disabled. Please contact shopkya.a@gmail.com to know more."})
    }
    // sendMessage(`Hello,\n\nOTP to login to your ShopKya account is ${otp}. Valid only once for 15 minutes. -ShopKya`, [phone_no], otp)
    let otp;
if (phone_no === OTP_BYPASS_PHONE) {
  otp = OTP_BYPASS_OTP;
  // DO NOT send sms
} else {
  otp = await sendMobileOtp();
  sendMessage(`Hello,\n\nOTP to login to your ShopKya account is ${otp}. Valid only once for 15 minutes. -ShopKya`, [phone_no], otp)
}

await customersModel.updateOne({ phone_no }, { otp }, { upsert: true });
    // await customersModel.updateOne({ phone_no }, { otp }, { upsert: true });

    return res.status(200).json({
      message: "OTP sent successfully",
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

const resendOtp = async (req, res) => {
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
    const customerData = await customersModel.findOne({ phone_no });
    if (!customerData) {
      return res.status(200).json({
        message: "Customer not found",
        error: true,
      });
    }
    // const otp = await sendMobileOtp();
    // sendMessage(`Hello,\n\nOTP to login to your ShopKya account is ${otp}. Valid only once for 15 minutes. -ShopKya`, [phone_no], otp)

    let otp;
if (phone_no === OTP_BYPASS_PHONE) {
  otp = OTP_BYPASS_OTP;
  // NO SMS here also
} else {
  otp = await sendMobileOtp();
  sendMessage(`Hello,\n\nOTP to login to your ShopKya account is ${otp}. Valid only once for 15 minutes. -ShopKya`, [phone_no], otp)
}
    await customersModel.updateOne({ phone_no }, { otp });

    return res.status(200).json({
      message: "OTP sent successfully",
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
    const { phone_no, otp, device_token } = req.body;
    const foundCustomer = await customersModel.findOne({ phone_no }).exec();
    if (!foundCustomer) {
      return res.status(200).json({
        message: "Customer not found",
        error: true,
      });
    }
    
    if (String(foundCustomer.otp)  === String(otp)) {//String(foundCustomer.otp) 
      await customersModel.updateMany({}, { $pull: { device_token } });
      const customerData = await customersModel
        .findByIdAndUpdate(foundCustomer._id, {
          otp: "",
          $addToSet: { device_token },
        })
        .exec();
      if (!customerData.is_first_time) {
        const token = await jwt.sign(
          {
            customer_id: foundCustomer._id,
            name: foundCustomer.name,
            phone_no: phone_no,
          },
          process.env.jwt_secret
        );

        return res.status(200).json({
          message: "OTP verified successfully",
          error: false,
          token,
          customerData,
        });
      }

      return res.status(200).json({
        message: "OTP verified successfully",
        error: false,
        customerData,
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

const updateCustomerName = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { first_name, last_name, id, email, referred_by_code } = req.body;

    const foundCustomer = await customersModel.findById(id);
    if (!foundCustomer) {
      return res.status(200).json({
        error: true,
        message: "Please enter valid customer id",
      });
    }
    let referred_rewards = {};
    let referral_code = "";
    let referrer = {};
    
    if (referred_by_code) {
      referrer = await customersModel.findOne({referral_code:referred_by_code})
      // const referrer_rewards = await systemConfigModel.findOne({
      //   type: "referrer_rewards",
      // });
      // referrer = await customersModel.findOneAndUpdate(
      //   { referral_code: referred_by_code },
      //   {
      //     $inc: {
      //       rewards:
      //         referrer_rewards && referrer_rewards.reward
      //           ? referrer_rewards.reward
      //           : 0,
      //     },
      //   }
      // );
      if (!referrer) {
        return res.status(200).json({
          error: true,
          message: "Please enter valid referral code",
        });
      }
      // await walletTransaction.create({
      //   customer_id: referrer._id,
      //   rewards:
      //     referrer_rewards && referrer_rewards.reward
      //       ? referrer_rewards.reward
      //       : 0,
      //   description: `Referred to ${id}`,
      // });

      // referred_rewards = await systemConfigModel.findOne({
      //   type: "referred_rewards",
      // });
    }

    let loop = true;
    while (loop) {
      referral_code = sendReferralCode();
      const customer = await customersModel.findOne({
        referral_code: referral_code,
      });
      if (!customer) {
        loop = false;
      }
    }

    // QR code for referral

    const apiUrl = `https://stagingapi.shopkya.in/customer/verify_referral_qr?referral_code=${referral_code}`;

    const qrDataUrl = await QRCode.toDataURL(apiUrl, {
        color: {
            dark: "#000", // Black QR dots
            light: "#FFF", // White background
        },
    });

    const base64Data = qrDataUrl.replace(/^data:image\/jpeg;base64,/, '');

    const qrS3Url = await base64Upload(`customers`, `${id}QR.jpeg`, "image/jpeg", base64Data);

    await customersModel.findByIdAndUpdate(id, {
      first_name,
      last_name,
      email,
      is_first_time: false,
      referral_code: referral_code,
      referred_by: referrer ? referrer._id : "",
      referral_qr: qrS3Url,
      // $inc: {
      //   rewards:
      //     referred_rewards && referred_rewards.reward
      //       ? referred_rewards.reward
      //       : 0,
      // },
    });
    const token = await jwt.sign(
      {
        customer_id: foundCustomer._id,
        first_name: first_name,
        last_name: last_name,
        phone_no: foundCustomer.phone_no,
      },
      process.env.jwt_secret
    );

    const customerData = await customersModel.findById(id);
    var mailData = {
      email,
      templateId: "d-1f06b17e0bfb44a385747657b883e05a",
      dynamic_template_data: {
        first_name: first_name,
        last_name: last_name,
        msg1: "Welcome to ShopKya. We are glad to have you on board. Hope you have a wonderful shopping and earning experience on our platform.",
        subject: `Sign up successful`,
      },
    };

    // await sendEmail(mailData);

    // await walletTransaction.create({
    //   customer_id: id,
    //   rewards:
    //     referred_rewards && referred_rewards.reward
    //       ? referred_rewards.reward
    //       : 0,
    //   description: `Referred by code ${referrer._id}`,
    // });

    return res.status(200).json({
      message: "Profile updated successfully",
      error: false,
      customerData,
      token,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const verifyReferralQR = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { referral_code } = req.query
    const registeredUser = await customer.findOne({referral_code: referral_code}).select("referral_code")
    if (!registeredUser) {
      return res.status(200).json({
        message: "Invalid QR code",
        error: true,
      });
    }
    return res.status(200).json({
      message: "Succesfully fetched referral code",
      error: false,
      registeredUser
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const aboutCustomer = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { dob, gender, id } = req.body;
    await customersModel.findByIdAndUpdate(id, { dob: dob, gender: gender });

    const customerData = await customersModel.findById(id);

    return res.status(200).json({
      message: "Customer information saved successfully",
      error: false,
      customerData,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { first_name, last_name, phone_no, email, dob, gender, profile_pic } = req.body;
    const { _id } = req.user;

    const updateData = {
      first_name,
      last_name,
      email,
      phone_no,
      dob,
      gender,
    };

    if (profile_pic) {
      updateData.profile_pic = profile_pic;
    }

    const updatedCustomer = await customersModel.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    return res.status(200).json({
      message: "Successfully updated profile",
      error: false,
      profile_pic: updatedCustomer?.profile_pic || null
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


// const updateCustomer = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }

//     const { first_name, last_name, phone_no, email, dob, gender, profile_pic } = req.body;
//     const { _id } = req.user;

//     let profilePicUrl;

//     if (profile_pic && profile_pic.startsWith("data:image")) {

//       // get extension from base64 string (like "png" or "jpeg")
//       const mime = profile_pic.match(/data:(.*?);base64/)[1];
//       const ext = mime.split("/")[1];

//       const fileName = `customers/profile/${_id}_${Date.now()}.${ext}`;

//       profilePicUrl = base64Upload("customers/profile", `${_id}_${Date.now()}.${ext}`, mime, profile_pic);
//     }

//     // prepare update data
//     const updateData = {
//       first_name,
//       last_name,
//       email,
//       phone_no,
//       dob,
//       gender,
//     };

//     if (profilePicUrl) {
//       updateData.profile_pic = profilePicUrl;
//     }

//     await customersModel.findByIdAndUpdate(_id, updateData, { new: true });

//     return res.status(200).json({ 
//       message: "Successfully updated profile", 
//       error: false,
//       profile_pic: profilePicUrl 
//     });
//   } catch (error) {
//     return res.status(200).json({
//       message: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };

const updateCustomerAddress = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { title, flat, area } = req.body;
    const { _id } = req.user;
    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${flat}${area}&key=AIzaSyB-O9JNkD_MeknPdgDZ_WU69RXsXyvoZP4`
    );
    const address = new addressModel({
      title: title,
      flat: flat,
      area: area,
      customer_id: _id,
      latitude: data  && data.results && data.results[0] && data.results[0].geometry && data.results[0].geometry.location && data.results[0].geometry.location.lat ? data.results[0].geometry.location.lat : "",
      longitude: data  && data.results && data.results[0] && data.results[0].geometry && data.results[0].geometry.location && data.results[0].geometry.location.lng ? data.results[0].geometry.location.lng : "",
    });
    await address.save();
    return res.status(200).json({ message: "Successfully saved address" , error: false});
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const editAddress = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { id, title, flat, area } = req.body;
    
    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${flat}${area}&key=AIzaSyB-O9JNkD_MeknPdgDZ_WU69RXsXyvoZP4`
    )
    const address = await addressModel.findByIdAndUpdate(id, {
      title: title,
      flat: flat,
      area: area,
      latitude: data  && data.results && data.results[0] && data.results[0].geometry && data.results[0].geometry.location && data.results[0].geometry.location.lat ? data.results[0].geometry.location.lat : "",
      longitude: data  && data.results && data.results[0] && data.results[0].geometry && data.results[0].geometry.location && data.results[0].geometry.location.lng ? data.results[0].geometry.location.lng : "",
    });
    return res
      .status(200)
      .json({ message: "Successfully updated your address" , error: false });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const deleteAddress = async (req, res) => {
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
    await addressModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Successfully deleted address" , error: false });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const listAddresses = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { _id } = req.user;
    const { shop_id } = req.query;
    if(shop_id){
      const addressData = await addressModel.find({ customer_id: _id });
      const shopData = await shop.findById(shop_id)
      for(let address of addressData){
        const { data:{rows} } = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json?` + 
              `units=metric&` +
              `mode=driving&` +
              `origins=${address.latitude}%2C${address.longitude}&` + 
              `destinations=${shopData.latitude}%2C${shopData.longitude}&` + 
              `key=AIzaSyB-O9JNkD_MeknPdgDZ_WU69RXsXyvoZP4`);
         address.farAway = rows && rows[0] && rows[0].elements && rows[0].elements[0] && rows[0].elements[0].distance && rows[0].elements[0].distance.value < 10000 ? false : true
      }
      
      return res
        .status(200)
        .json({ message: "Succesfully fetched address data", error: false, addressData });
    } else {
      const addressData = await addressModel.find({ customer_id: _id });
      return res
      .status(200)
      .json({ message: "Succesfully fetched address data", error: false , addressData });
    }
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const addReferral = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { id, ref_code } = req.body;
    const referrer = await refferalModel
      .find({ ref_code: ref_code })
      .select("_id");
    if (!referrer) {
      return res.status(200).json({
        error: true,
        message: "Please enter valid referral code",
      });
    }
    await customersModel.findByIdAndUpdate(id, { referred_by: referrer });
    return res.status(200).json({ message: "Successfully saved referrence" , error: false });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const customerListingAdmin = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { search } = req.query;
    if (search) {
      const customerData = await customersModel.find({
        $or: [
          { first_name: { $regex: search, $options: "i" } },
          { last_name: { $regex: search, $options: "i" } },
          { phone_no: { $regex: search, $options: "i" } },
        ],
        is_first_time: false,
      }).populate('referred_by',['name']).sort({createdAt: -1});
      return res
        .status(200)
        .json({ message: "Successfully fetched customer", error: false , customerData });
    } else {
      const customerData = await customersModel.find({ is_first_time: false }).populate('referred_by',['name']).sort({createdAt: -1});
        return res
        .status(200)
        .json({ message: "Successfully fetched customer", error: false , customerData });
    }
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const logout = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { _id } = req.user;
    const { device_token } = req.body;
    await customersModel
      .findByIdAndUpdate(_id, { $pull: { device_token } })
      .exec();

    return res.status(200).json({
      message: "User logged out successfully",
      error: false,
    });
  } catch (error) {
    return res.status(200).json({
      message: "User logged out successfully",
      error: false,
    });
  }
};

const updateBankDetails = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { _id } = req.user;
    const {
      // banking_name,
      // bank_ac_no,
      // confirm_bank_ac_no,
      // ifsc_code,
      // account_type,
      upi,
    } = req.body;
    const foundCustomer = await customersModel.findById(_id).exec();
    if (!foundCustomer) {
      return res.status(200).json({
        error: true,
        message: "Customer not found",
      });
    }

    // if (bank_ac_no) {
    //   if (!confirm_bank_ac_no || !ifsc_code || !banking_name || !account_type) {
    //     return res.status(200).json({
    //       error: true,
    //       title: "Please provide valid bank details",
    //     });
    //   }

    //   if (bank_ac_no != confirm_bank_ac_no) {
    //     return res.status(200).json({
    //       error: true,
    //       title:
    //         "Bank account number is not matching with confirmed bank account number",
    //     });
    //   }
    //   const alreadyPresent = await customersModel.findOne({
    //     _id: { $ne: _id },
    //     "bank.bank_ac_no": bank_ac_no,
    //   });
    //   if (alreadyPresent) {
    //     return res.status(200).json({
    //       error: true,
    //       title: `Your bank account is registered with another account. Please enter unique bank account number`,
    //     });
    //   }
    //   let contact_id = foundCustomer.contact_id;
    //   if (!foundCustomer.contact_id) {
    //     const { data } = await axios.post(
    //       "https://api.razorpay.com/v1/contacts",
    //       {
    //         name: foundCustomer.name,
    //         email: foundCustomer.email,
    //         contact: foundCustomer.phone_no,
    //         type: "vendor",
    //       },
    //       {
    //         auth: {
    //           username: process.env.RAZORPAY_KEY_ID,
    //           password: process.env.RAZORPAY_KEY_SECRET,
    //         },
    //       }
    //     );
    //     contact_id = data.id;
    //   }
    //   const maskedAccountNumber = bank_ac_no.replace(/\d(?=\d{4})/g, "X");
    //   let update = {
    //     "bank.banking_name": banking_name,
    //     "bank.bank_ac_no": maskedAccountNumber,
    //     "bank.ifsc_code": ifsc_code,
    //     "bank.account_type": account_type,
    //     contact_id: contact_id
    //   };
    //   await customersModel.findByIdAndUpdate(_id, update);
    //   const { data } = await axios.post(
    //     "https://api.razorpay.com/v1/fund_accounts",
    //     {
    //       contact_id,
    //       account_type: "bank_account",
    //       bank_account: {
    //         name: banking_name,
    //         ifsc: ifsc_code,
    //         account_number: bank_ac_no,
    //       },
    //     },
    //     {
    //       auth: {
    //         username: process.env.RAZORPAY_KEY_ID,
    //         password: process.env.RAZORPAY_KEY_SECRET,
    //       },
    //     }
    //   );
    //   // await axios.post(
    //   //   "https://api.razorpay.com/v1/fund_accounts/validations",
    //   //   {
    //   //     account_number: bank_ac_no,
    //   //     fund_account: {
    //   //       id: contact_id,
    //   //     },
    //   //     amount: 100,
    //   //     currency: "INR",
    //   //   },
    //   //   {
    //   //     auth: {
    //   //       username: process.env.RAZORPAY_KEY_ID,
    //   //       password: process.env.RAZORPAY_KEY_SECRET,
    //   //     },
    //   //   }
    //   // );
    //   if (foundCustomer.razorpay_bank_fund_ac_no) {
    //     try {
    //       await axios.patch(
    //         `https://api.razorpay.com/v1/fund_accounts/${foundCustomer.razorpay_bank_fund_ac_no}`,
    //         { active: false },
    //         {
    //           auth: {
    //             username: process.env.RAZORPAY_KEY_ID,
    //             password: process.env.RAZORPAY_KEY_SECRET,
    //           },
    //         }
    //       );
    //     } catch (error) {
    //       console.log("Error while deactivating fund account");
    //     }
    //   }
    //   const ifscData = await axios.get(
    //     `https://ifsc.razorpay.com/${ifsc_code}`
    //   );
    //   update = {
    //     razorpay_bank_fund_ac_no: data.id,
    //     "bank.bank_name": ifscData.data.BANK,
    //     "bank.bank_branch": ifscData.data.BRANCH,
    //     bank_func_ac_status: "pending",
    //   };
    //   await customersModel.findByIdAndUpdate(_id, update);
    //   res
    //     .status(200)
    //     .json({ message: "Bank details updated successfully", error: false });
    // }
    if (upi) {
      const alreadyPresent = await customersModel.findOne({
        _id: { $ne: _id },
        upi,
      });
      if (alreadyPresent) {
        return res.status(200).json({
          error: true,
          message: `Your UPI id is registered with another account. Please enter unique UPI id`,
        });
      }
      // let contact_id = foundCustomer.contact_id;
      // if (!foundCustomer.contact_id) {
      //   const { data } = await axios.post(
      //     "https://api.razorpay.com/v1/contacts",
      //     {
      //       name: foundCustomer.name,
      //       email: foundCustomer.email,
      //       contact: foundCustomer.phone_no,
      //       type: "vendor",
      //     },
      //     {
      //       auth: {
      //         username: process.env.RAZORPAY_KEY_ID,
      //         password: process.env.RAZORPAY_KEY_SECRET,
      //       },
      //     }
      //   );
      //   contact_id = data.id;
      // }
      await customersModel.findByIdAndUpdate(_id, { upi: upi });

      // const { data } = await axios.post(
      //   "https://api.razorpay.com/v1/fund_accounts",
      //   {
      //     contact_id,
      //     account_type: "vpa",
      //     vpa: {
      //       address: upi,
      //     },
      //   },
      //   {
      //     auth: {
      //       username: process.env.RAZORPAY_KEY_ID,
      //       password: process.env.RAZORPAY_KEY_SECRET,
      //     },
      //   }
      // );
      // if (foundCustomer.razorpay_upi_fund_ac_no) {
      //   try {
      //     await axios.patch(
      //       `https://api.razorpay.com/v1/fund_accounts/${foundCustomer.razorpay_upi_fund_ac_no}`,
      //       { active: false },
      //       {
      //         auth: {
      //           username: process.env.RAZORPAY_KEY_ID,
      //           password: process.env.RAZORPAY_KEY_SECRET,
      //         },
      //       }
      //     );
      //   } catch (error) {
      //     console.log("Error while deactivating fund account");
      //   }
      // }
      // update = {
      //   razorpay_upi_fund_ac_no: data.id,
      //   upi_func_ac_status: "pending",
      // };
      // await customersModel.findByIdAndUpdate(_id, update);
      res.status(200).json({ message: "UPI updated successfully", error: false });
    }
  } catch (error) {
    console.log(error);
    console.log(error && error.response && error.response.data);
    return res.status(500).json({
      message:
        error &&
        error.response &&
        error.response.data &&
        error.response.data.error
          ? error.response.data.error.description
          : error.message || "Something went wrong",
      error: true,
      data: error,
    });
  }
};

// const customerDetails = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }
//     const { _id } = req.user;
//     const customerData = await customersModel
//       .findById(_id)
//       .select([
//         "email",
//         "name",
//         "referral_code",
//         "rewards",
//         "dob",
//         "gender",
//         "phone_no",
//         "upi",
//         "spent_amount",
//         "redeem_requested",
//         "is_disabled"
//     ]);

//     const redeemData = await redeemModel.aggregate([
//       { $match: { customer_id: _id }},
//       { $unwind: "$offer_id" },
//       { $group: { _id: "$offer_id", redeemed_count: { $sum: 1 }}},
//     ]);

//     const maintainanceData = await maintainance.findOne({})

//     return res.status(200).json({
//       message: "Customer data fetched successfully",
//       error: false,
//       customerData,
//       redeemData,
//       maintainanceData
//     });
//   } catch (error) {
//     return res.status(200).json({
//       message: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };


const customerDetails = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { _id } = req.user;

    // Fetch customer basic data
    const customerData = await customersModel
      .findById(_id)
      .select([
        "email",
        "name",
        "first_name",
        "last_name",
        "referral_code",
        "rewards",
        "dob",
        "gender",
        "phone_no",
        "upi",
        "redeem_requested",
        "profile_pic",
        "is_disabled",
      ]);

    // Redeem aggregation
    const redeemData = await redeemModel.aggregate([
      { $match: { customer_id: _id } },
      { $unwind: "$offer_id" },
      { $group: { _id: "$offer_id", redeemed_count: { $sum: 1 } } },
    ]);

    // Maintenance data
    const maintainanceData = await maintainance.findOne({});

    // ✅ Earned Till Now aggregation
    const earnedAgg = await redeemReq.aggregate([
      {
        $match: {
          customer_id: _id,
          status: "fulfilled",
        },
      },
      {
        $group: {
          _id: null,
          totalCoins: { $sum: "$coins" },
        },
      },
    ]);

    const earnedTillNow =
      earnedAgg.length > 0 ? earnedAgg[0].totalCoins / 100 : 0;

    return res.status(200).json({
      message: "Customer data fetched successfully",
      error: false,
      customerData,
      redeemData,
      maintainanceData,
      earnedTillNow, 
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


const addManualReward = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { id, rewards, notification , notify_user} = req.body;
    const customer = await customersModel.findByIdAndUpdate(id, {
      $inc: {
        rewards: rewards ? rewards : 0,
      },
    });

    await walletTransaction.create({
      customer_id: id,
      rewards: rewards ? rewards : 0,
      description: "Rewards added by admin",
    });
    
    if(notify_user == true){
      if (customer && customer.device_token && customer.device_token.length > 0) {
        const title = "Excuse me, something is waiting for you";
        // const body = String(id);
        const body = "";
        const not_body = `${notification}`;
        for (const token of customer.device_token) {
          await sendPushNotification(token, title, body, not_body);
        }
      }
    }
    
    return res.status(200).json({
      message: "Rewards added successfully",
      error: false,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const sendOTP = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { _id } = req.user
    const otp = await sendMobileOtp();
    const user = await customersModel.findByIdAndUpdate(_id, { otp });
    // sendMessage(`Hello,\n\nOTP to login to your ShopKya account is ${otp}. Valid only once for 15 minutes. -ShopKya`, [user.phone_no], otp)
    return res.status(200).json({message:"OTP sent" , error: false})
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const deleteMyAccount = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { _id } = req.user
    const { otp } = req.body
    const user = await customersModel.findById(_id)
    if(String(otp) == String(user.otp)){// 
      await addressModel.deleteMany({customer_id:_id})
      await cart.findOneAndDelete({customer_id:_id})
      await note.deleteMany({customer_id:_id})
      await order.deleteMany({customer_id:_id})
      await query.deleteMany({customer_id:_id})
      await redeem.deleteMany({customer_id:_id})
      await redeemReq.deleteMany({customer_id:_id})
      await walletTransaction.deleteMany({customer_id:_id})
      await customersModel.findByIdAndDelete(_id)
      return res.status(200).json({message:"Successfully deleted user's account", error: false})
    } else {
      return res.status(200).json({message:"Invalid OTP", error: true})
    } 
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const enableDisableCustomer = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { is_disabled , customer_id } = req.body
    await customersModel.findByIdAndUpdate(customer_id,{ is_disabled })
    return res.status(200).json({error:false, message:`Successfully ${is_disabled == true ? "disabled" : "enabled"} user`})
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


const redirectApp = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const userAgent = req.headers['user-agent'].toLowerCase();
console.log(userAgent)
    if (/android/.test(userAgent)) {
    // Redirect to Google Play Store
      res.redirect('https://play.google.com/store/apps/details?id=com.infiiny.shopkya&pcampaignid=web_share');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
    // Redirect to Apple App Store
      res.redirect('https://apps.apple.com/in/app/shopkya/id6499516759');
    } else {
    // Redirect to a fallback page (e.g., your website)
      res.redirect('https://www.shopkya.in/');
    }
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const versionCheck = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const {current_version, device_type} = req.body
    const versionData = await version.findOne({})
 
    if (!versionData) {
      return res.status(200).json({ message: "Version data not found", error: true });
    }

    if (!versionData.check) {
      return res.status(200).json({ error: false, message: "Version check skipped" });
    }
 
    if(device_type == "android"){
      if(current_version != versionData.android && versionData.check){
        return res.status(200).json({message:"Version missmatch", error:true})
      }
    }
    if(device_type == "ios"){
      if(current_version != versionData.ios && versionData.check){
        return res.status(200).json({message:"Version missmatch", error:true})
      }
    }  
    return res.status(200).json({error:false, message:"Version matched"})
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const personalisedDeals = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { _id } = req.user;
    const { dob, gender } = req.body;
    await customersModel.findByIdAndUpdate(_id, { dob: dob, gender: gender });

    const customerData = await customersModel.findById(_id);

    return res.status(200).json({
      message: "Customer information saved successfully",
      error: false,
      customerData,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const getAllLabels = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const labels = await labelModel.find({
          is_featured: { $ne: true },
          is_shop: { $ne: true },
        }).sort({ order: 1, createdAt: -1 });

        return res.status(200).json({
            error: false,
            message: "Labels fetched successfully",
            labels,
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({
            error: true,
            message: error.message || "Something went wrong",
        });
    }
};

// const getLabelOffers = async (req, res) => {
//     try {
//         const result = validationResult(req);
//         if (result.errors.length > 0) {
//             return res.status(200).json({
//                 error: true,
//                 title: result.errors[0].msg,
//                 errors: result,
//             });
//         }

//         const { label_id } = req.query;

//         if (label_id) {
//             const offers = await offerModel
//                 .find({ label_id: label_id })
//                 .sort({ createdAt: -1 });


//             return res.status(200).json({
//                 error: false,
//                 message: "Offers fetched successfully",
//                 offers,
//             });
//         } else {
//             const offers = await offerModel.find().sort({ createdAt: -1 });

//             return res.status(200).json({
//                 error: false,
//                 message: "Offers fetched successfully",
//                 offers,
//             });
//         }
//     } catch (error) {
//         console.error(error);
//         return res.status(200).json({
//             error: true,
//             message: error.message || "Something went wrong",
//         });
//     }
// };


const getLabelOffers = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { _id: customerId } = req.user;
    const { label_id } = req.query;
    const now = new Date();

    // --- Fetch favourite offers of this customer ---
    const favouriteOffers = await favouriteOffer
      .find({ customer_id: customerId })
      .select("offer_id")
      .lean();
    const favouriteSet = new Set(favouriteOffers.map(fav => fav.offer_id.toString()));

    // --- Build query based on label_id ---
    let query = {
      offer_start: { $lte: now },
      offer_expiry: { $gte: now },
      is_hidden: false
    };

    if (label_id) {
      query.label_id = label_id;
    } else {
      query.$or = [{ label_id: { $exists: false } }, { label_id: null }];

    }

    // --- Fetch offers ---
    const offers = await offerModel.find(query).sort({ order: 1 }).lean();



    // --- Transform response ---
    const formattedOffers = offers.map(offer => {
      const highestReward =
        offer.product_details?.reduce(
          (max, pd) => (pd.reward > max ? pd.reward : max),
          0
        ) || 0;

      return {
        offer_id: offer._id,
        offer_title: offer.offer_title,
        order: offer.order,
        highest_reward: highestReward,
        favourite: favouriteSet.has(offer._id.toString()),
        offer_display: offer.offer_display || null,
      };
    });

    return res.status(200).json({
      error: false,
      message: "Offers fetched successfully",
      offers: formattedOffers,
    });
  } catch (error) {
    console.error(error);
    return res.status(200).json({
      error: true,
      message: error.message || "Something went wrong",
    });
  }
};


// const getLabelOffers = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }

//     const { label_id } = req.query;

//     let offers;

//     if (label_id) {
//       offers = await offerModel
//         .find({ label_id })
//         .sort({ createdAt: -1 });
//     } else {
//       offers = await offerModel
//         .find({ $or: [{ label_id: { $exists: false } }, { label_id: null }] })
//         .sort({ createdAt: -1 });
//     }

//     return res.status(200).json({
//       error: false,
//       message: "Offers fetched successfully",
//       offers,
//     });
//   } catch (error) {
//     console.error(error);
//     return res.status(200).json({
//       error: true,
//       message: error.message || "Something went wrong",
//     });
//   }
// };


const totalCoinsRedeemed = async (req, res) => {
  try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
          return res.status(200).json({
              error: true,
              title: result.errors[0].msg,
              errors: result,
          });
      }

      const { _id } = req.user;

      const redeems = await redeemReq.find({customer_id: _id , status: "fulfilled"}).sort({ createdAt: -1 });

      let total_coins = 0;

      redeems.forEach((redeem) => {
        total_coins += redeem.coins; 
      })

      let total_amount = total_coins / 100;

      return res.status(200).json({
          error: false,
          message: "Total Coins fetched successfully",
          total_coins,
          total_amount
      });
  } catch (error) {
      console.error(error);
      return res.status(200).json({
          error: true,
          message: error.message || "Something went wrong",
      });
  }
};

const rewardsTab = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { _id } = req.user;
    const { tab } = req.query;

    if (!tab || !['redeemed', 'earned'].includes(tab)) {
      return res.status(200).json({
        error: true,
        message: "Invalid or missing 'tab' parameter. Allowed values: redeemed, earned",
      });
    }

    let data = [];
    let formattedData = [];

    if (tab === "redeemed") {
      data = await redeemReq
        .find({ customer_id: _id, status: "fulfilled" })
        .sort({ createdAt: -1 })
        .populate("shop_id", "shop_name shop_logo");
    }

    if (tab === "redeemed") {
      formattedData = data.map((item) => {
        const obj = item.toObject();
        return {
          ...obj,
          redeem_type: obj.shop_id ? "instore" : "upi",
          amount: obj.coins / 100,
        };
      });
    }

    if (tab === "earned") {
      const agg = await orderRewardBreakdown.aggregate([
        
        { $match: { customer_id: new mongoose.Types.ObjectId(_id) } },

        // Group all documents by shop_id, summing order_rewards and collecting offers arrays
        {
          $group: {
            _id: "$shop_id",
            total_shop_reward: { $sum: "$order_rewards.shop_reward" },
            total_milestone_reward: { $sum: "$order_rewards.milestone_reward" },
            total_scan_reward: { $sum: "$order_rewards.scan_reward" },
            offersArrays: { $push: "$offers" } 
          }
        },

        
        { $unwind: { path: "$offersArrays", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$offersArrays", preserveNullAndEmptyArrays: true } },

        // Group by shop + offer + company to sum rewards per offer
        {
          $group: {
            _id: {
              shop_id: "$_id",
              offer_id: "$offersArrays.offer_id",
              company_id: "$offersArrays.company_id"
            },
            total_shop_reward: { $first: "$total_shop_reward" },
            total_milestone_reward: { $first: "$total_milestone_reward" },
            total_scan_reward: { $first: "$total_scan_reward" },
            total_offer_reward: { $sum: { $ifNull: ["$offersArrays.reward", 0] } }
          }
        },

        // Re-group by shop to build the offers[] list
        {
          $group: {
            _id: "$_id.shop_id",
            total_shop_reward: { $first: "$total_shop_reward" },
            total_milestone_reward: { $first: "$total_milestone_reward" },
            total_scan_reward: { $first: "$total_scan_reward" },
            offers: {
              $push: {
                offer_id: "$_id.offer_id",
                company_id: "$_id.company_id",
                total_offer_reward: "$total_offer_reward"
              }
            }
          }
        },

        // Lookup shop details but only project shop_name & shop_logo
        {
          $lookup: {
            from: "shops",
            let: { shopId: "$_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$shopId"] } } },
              { $project: { shop_name: 1, shop_logo: 1, _id: 0 } }
            ],
            as: "shop_doc"
          }
        },
        { $unwind: { path: "$shop_doc", preserveNullAndEmptyArrays: true } },

        // set shop_id to the small shop object we need (or null)
        {
          $addFields: {
            shop_id: { $ifNull: ["$shop_doc", null] }
          }
        },

        // remove temp shop_doc
        { $project: { shop_doc: 0 } },

        { $unwind: { path: "$offers", preserveNullAndEmptyArrays: true } },

        {
          $lookup: {
            from: "companies",
            let: { cid: "$offers.company_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$cid"] } } },
              { $project: { company_name: 1, _id: 0 } } 
            ],
            as: "company_doc"
          }
        },
        { $unwind: { path: "$company_doc", preserveNullAndEmptyArrays: true } },

        
        {
          $addFields: {
            "offers.company_id": { $ifNull: [{ company_name: "$company_doc.company_name" }, null] }
          }
        },

        
        { $project: { company_doc: 0 } },

        
        {
          $group: {
            _id: "$_id",
            shop_id: { $first: "$shop_id" },
            total_shop_reward: { $first: "$total_shop_reward" },
            total_milestone_reward: { $first: "$total_milestone_reward" },
            total_scan_reward: { $first: "$total_scan_reward" },
            offers: { $push: "$offers" }
          }
        },

        // remove possible null offer entries
        {
          $addFields: {
            offers: {
              $filter: {
                input: "$offers",
                as: "o",
                cond: { $ne: ["$$o", null] }
              }
            }
          }
        },

        {
          $project: {
            _id: 0,
            shop_id: 1,
            total_shop_reward: 1,
            total_milestone_reward: 1,
            total_scan_reward: 1,
            offers: 1
          }
        }
      ]);

      formattedData = agg;
    }

    return res.status(200).json({
      error: false,
      message: `Rewards ${tab} history fetched successfully`,
      data: formattedData,
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({
      error: true,
      message: error.message || "Something went wrong",
    });
  }
};


const getAllRewards = async (req, res) => {
  try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
          return res.status(200).json({
              error: true,
              title: result.errors[0].msg,
              errors: result,
          });
      }

      const { _id } = req.user;

      const shopRewards = await shop.find().select("rewards milestone_rewards shop_name").sort({createdAt: -1});

      const systemConfigRewards = await systemConfigModel.find().select("type reward").sort({createdAt: -1});

      const amountSpent = await customer.findById(_id).select("spent_amount");

      return res.status(200).json({
          error: false,
          message: "Shop Rewards fetched successfully",
          shopRewards,
          systemConfigRewards,
          amountSpent,
      });
  } catch (error) {
      console.error(error);
      return res.status(200).json({
          error: true,
          message: error.message || "Something went wrong",
      });
  }
};


const getAllRewardsForShop = async (req, res) => {
  try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
          return res.status(200).json({
              error: true,
              title: result.errors[0].msg,
              errors: result,
          });
      }

      const { _id } = req.user;
      const { shop_id } = req.query;

      if(!shop_id){
        return res.status(200).json({
            error: true,
            message: "Shop ID is required",
        });
      }

      const shopRewards = await shop.findById(shop_id).select("rewards milestone_rewards shop_name shop_description milestone_description").sort({createdAt: -1});

      const { latitude, longitude } = await shop.findById(shop_id).select("latitude longitude");

      const systemConfigRewards = await systemConfigModel.find().select("type reward").sort({createdAt: -1});

      const amountSpent = await customer.findById(_id).select("spent_amount");

      return res.status(200).json({
          error: false,
          message: "Shop Rewards fetched successfully",
          latitude,
          longitude,
          shopRewards,
          systemConfigRewards,
          amountSpent,
      });
  } catch (error) {
      console.error(error);
      return res.status(200).json({
          error: true,
          message: error.message || "Something went wrong",
      });
  }
};


// const homeScreenData = async (req, res) => {
//   try {
//     const { _id: customerId } = req.user;
//     const now = new Date();
//     const currentMonth = dayjs().format("MMMM").toLowerCase();
//     const currentYear = dayjs().format("YYYY");

//     // --- Counts ---
//     const favouriteCount = await favouriteOffer.countDocuments({ customer_id: customerId });
//     const notesCount = await notesModel.countDocuments({ customer_id: customerId });

//     // --- Featured Offer Banners ---

//     const featuredOfferBanners = await offerModel.find({ offer_start: { $lte: now }, offer_expiry: { $gte: now }, is_hidden: false, is_featured: true }).select("_id offer_banner");

//     // --- Offers grouped by label ---
//     const offers = await offerModel
//       .find({ offer_start: { $lte: now }, offer_expiry: { $gte: now }, is_hidden: false })
//       .populate('label_id', ['title' , 'order'])
//       .sort({ order: 1 })
//       .lean();

//     const favouriteOffers = await favouriteOffer.find({ customer_id: customerId }).select('offer_id').lean();
//     const favouriteSet = new Set(favouriteOffers.map(fav => fav.offer_id.toString()));

//     const offersByLabel = {};
//     offers.forEach(offer => {
//       const labelId = offer.label_id?._id?.toString() || 'unlabeled';
//       const labelName = offer.label_id?.title || 'Unlabeled';
//       const labelOrder = offer.label_id?.order || 'Unlabeled';


//       if (!offersByLabel[labelId]) {
//         offersByLabel[labelId] = {
//           label_id: labelId,
//           label_name: labelName,
//           label_order: labelOrder,
//           offers: []
//         };
//       }

//       const highestReward = offer.product_details?.reduce((max, pd) => pd.reward > max ? pd.reward : max, 0) || 0;

//       offersByLabel[labelId].offers.push({
//         offer_id: offer._id,
//         offer_title: offer.offer_title,
//         order: offer.order,
//         highest_reward: highestReward,
//         favourite: favouriteSet.has(offer._id.toString()),
//         offer_display: offer.offer_display || null
//       });
//     });

//     // --- Shops with simplified milestone progress ---
//     const shops = await shopModel.find().lean();
//     const customer = await customersModel.findById(customerId).lean();

//     const shopsWithMilestones = shops.map(shop => {
//       const spentEntry = customer.spent_amount?.find(
//         s => String(s.shop_id) === String(shop._id) &&
//              s.month === currentMonth &&
//              s.year === currentYear
//       );
//       const currentAmount = spentEntry ? spentEntry.amount : 0;
    
//       const milestones = shop.milestone_rewards?.sort((a, b) => a.amount - b.amount) || [];
    
//       // Next milestone: first milestone greater than currentAmount
//       let nextMilestone = milestones.find(m => m.amount > currentAmount);
    
//       // If customer already reached all milestones, show last milestone as next
//       if (!nextMilestone && milestones.length > 0) {
//         nextMilestone = milestones[milestones.length - 1];
//       }
    
//       // Milestones achieved
//       // const milestonesAchieved = milestones
//       //   .filter(m => m.amount <= currentAmount)
//       //   .map(m => ({
//       //     milestoneAmount: m.amount,
//       //     milestoneReward: m.reward
//       //   }));
    
//       return {
//         shop_id: shop._id,
//         shop_name: shop.shop_name,
//         shop_logo: shop.shop_logo,
//         currentAmount,
//         progress: nextMilestone
//           ? Math.min(Math.round((currentAmount / nextMilestone.amount) * 100), 100)
//           : 100,
//         nextMilestone: nextMilestone
//           ? {
//               milestoneAmount: nextMilestone.amount,
//               milestoneReward: nextMilestone.reward,
//               amountToReach: Math.max(nextMilestone.amount - currentAmount, 0)
//             }
//           : null,
//         // milestonesAchieved
//       };
//     });

//     // --- Response ---
//     return res.status(200).json({
//       error: false,
//       message: "Home screen data fetched successfully",
//       counts: {
//         favourite_count: favouriteCount,
//         notes_count: notesCount
//       },
//       featured_offer_banners: featuredOfferBanners,
//       offers_by_label: Object.values(offersByLabel),
//       shops: shopsWithMilestones
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(200).json({
//       error: true,
//       message: error.message || "Something went wrong"
//     });
//   }
// };


const homeScreenData = async (req, res) => {
  try {
    const { _id: customerId } = req.user;
    const queryLat = parseFloat(req.query.lat);
    const queryLng = parseFloat(req.query.lng);
    let finalLat = queryLat;
    let finalLng = queryLng;


    const now = new Date();
    const currentMonth = dayjs().format('MMMM').toLowerCase();
    const currentYear = dayjs().format('YYYY');

    // --- Counts (sequential, no Promise.all) ---
    const favouriteCount = await favouriteOffer.countDocuments({ customer_id: customerId });
    const notesCount = await notesModel.countDocuments({ customer_id: customerId });

    // --- Featured Offer Banners (exact fields) ---
    const featuredOfferBanners = await offerModel
      .find({
        offer_start: { $lte: now },
        offer_expiry: { $gte: now },
        is_hidden: false,
        is_featured: true
      })
      .select('_id offer_banner')
      .sort({ banner_order: 1 })
      .lean();

    // --- All labels (to mirror your bucket build) ---
    const allLabels = await labelModel.find().sort({ order: 1 }).lean();

    // Build empty offersByLabel for every label (exact same structure/fields)
    const offersByLabelMap = {};
    for (const label of allLabels) {
      offersByLabelMap[label._id.toString()] = {
        label_id: label._id,           // ObjectId (not string) — matches your code
        label_name: label.title,
        label_order: label.order,
        is_featured: label.is_featured, // present only for labeled buckets
        is_shop: label.is_shop,         // present only for labeled buckets
        offers: []
      };
    }

    // --- Offers aggregation (active + visible) ---
    // Produces: offer_id, offer_title, order, highest_reward, favourite, offer_display, and the resolved label doc (if any)
    const offersAgg = await offerModel.aggregate([
      {
        $match: {
          offer_start: { $lte: now },
          offer_expiry: { $gte: now },
          is_hidden: false
        }
      },
      {
        $project: {
          _id: 1,
          offer_title: 1,
          order: { $ifNull: ['$order', 0] },
          offer_display: { $ifNull: ['$offer_display', null] },
          label_id: 1,
          product_details: { $ifNull: ['$product_details', []] }
        }
      },
      // Compute highest_reward from product_details.reward
      {
        $addFields: {
          highest_reward: {
            $cond: [
              { $gt: [{ $size: '$product_details' }, 0] },
              {
                $max: {
                  $map: {
                    input: '$product_details',
                    as: 'pd',
                    in: { $ifNull: ['$$pd.reward', 0] }
                  }
                }
              },
              0
            ]
          }
        }
      },
      // Load label doc
      {
        $lookup: {
          from: labelModel.collection.name,
          localField: 'label_id',
          foreignField: '_id',
          as: 'label'
        }
      },
      { $unwind: { path: '$label', preserveNullAndEmptyArrays: true } },
      // Favourite for THIS customer (existence check)
      {
        $lookup: {
          from: favouriteOffer.collection.name,
          let: { offerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$offer_id', '$$offerId'] },
                    { $eq: ['$customer_id', customerId] }
                  ]
                }
              }
            },
            { $limit: 1 }
          ],
          as: 'fav_hit'
        }
      },
      {
        $addFields: {
          favourite: { $gt: [{ $size: '$fav_hit' }, 0] }
        }
      },
      {
        $project: {
          _id: 1,
          offer_title: 1,
          order: 1,
          highest_reward: 1,
          favourite: 1,
          offer_display: 1,
          // Keep original ObjectId for labeled buckets, null for unlabeled
          label_obj_id: '$label._id',
          label_title: '$label.title',
          label_order: '$label.order',
          label_is_featured: '$label.is_featured',
          label_is_shop: '$label.is_shop'
        }
      }
    ]);

    // --- Assemble buckets EXACTLY like your original ---
    for (const o of offersAgg) {
      // if labeled
      if (o.label_obj_id && offersByLabelMap[o.label_obj_id.toString()]) {
        offersByLabelMap[o.label_obj_id.toString()].offers.push({
          offer_id: o._id,
          offer_title: o.offer_title,
          order: o.order,
          highest_reward: o.highest_reward,
          favourite: o.favourite,
          offer_display: o.offer_display
        });
      } else {
        // unlabeled bucket; only these fields per your code (no is_featured/is_shop here)
        if (!offersByLabelMap['unlabeled']) {
          offersByLabelMap['unlabeled'] = {
            label_id: '',
            label_name: 'All Offers',
            label_order: 9999,
            offers: []
          };
        }
        offersByLabelMap['unlabeled'].offers.push({
          offer_id: o._id,
          offer_title: o.offer_title,
          order: o.order,
          highest_reward: o.highest_reward,
          favourite: o.favourite,
          offer_display: o.offer_display
        });
      }
    }

    // --- Sort offers inside each label AND slice to top 10 (exactly as your code) ---
    Object.values(offersByLabelMap).forEach(label => {
      label.offers.sort((a, b) => (a.order || 0) - (b.order || 0));
      label.offers = label.offers.slice(0, 10);
    });

    // --- Shops with simplified milestone progress ---

    if (!queryLat || !queryLng) {
      // If location is OFF → fallback to last completed scan order of this user
      const lastCompletedOrder = await order
        .findOne({
          customer_id: customerId,
          order_status: "completed",
          shop_id: { $exists: true }
        })
        .populate("shop_id", ["location"])
        .sort({ createdAt: -1 })
        .lean();
    
        if (lastCompletedOrder?.shop_id?.location?.coordinates?.length === 2) {
          finalLng = lastCompletedOrder.shop_id.location.coordinates[0];
          finalLat = lastCompletedOrder.shop_id.location.coordinates[1];
        } else {
        finalLat = null;
        finalLng = null;
      }
    }

    let shops = [];

    if (finalLat != null && finalLng != null) {
      // Use geoNear when we have location
      shops = await shopModel.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [finalLng, finalLat] },
            distanceField: "distance",
            maxDistance: 1000,
            spherical: true,
            query: { is_dark: { $ne: true } }
          }
        }
      ]);
    } else {
      shops = await shopModel.find({
        is_dark: { $ne: true }
      }).lean();
    }


    // const shops = await shopModel.find({
    //   is_dark: { $ne: true } 
    // }).lean();

    // const shops = await shopModel.aggregate([
    //   {
    //     $geoNear: {
    //       near: { type: "Point", coordinates: [queryLng, queryLat] },
    //       distanceField: "distance",
    //       maxDistance: 1000,
    //       spherical: true,
    //       query: { is_dark: { $ne: true } }
    //     }
    //   }
    // ]);

    const customer = await customersModel.findById(customerId).lean();

    const shopsWithMilestones = (shops || []).map(shop => {
      const spentEntry = customer?.spent_amount?.find(
        s =>
          String(s.shop_id) === String(shop._id) &&
          s.month === currentMonth &&
          s.year === currentYear
      );
      const currentAmount = spentEntry ? spentEntry.amount : 0;

      const milestones = shop.milestone_rewards?.slice().sort((a, b) => (a.amount || 0) - (b.amount || 0)) || [];
      let nextMilestone = milestones.find(m => (m.amount || 0) > currentAmount);
      if (!nextMilestone && milestones.length > 0) {
        nextMilestone = milestones[milestones.length - 1];
      }

      return {
        shop_id: shop._id,
        shop_name: shop.shop_name,
        shop_logo: shop.shop_logo,
        currentAmount,
        progress: nextMilestone
          ? Math.min(Math.round((currentAmount / nextMilestone.amount) * 100), 100)
          : 100,
        nextMilestone: nextMilestone
          ? {
              milestoneAmount: nextMilestone.amount,
              milestoneReward: nextMilestone.reward,
              amountToReach: Math.max(nextMilestone.amount - currentAmount, 0)
            }
          : null
      };
    });

    // --- Final response (field-for-field identical) ---
    return res.status(200).json({
      error: false,
      message: 'Home screen data fetched successfully',
      counts: {
        favourite_count: favouriteCount,
        notes_count: notesCount
      },
      featured_offer_banners: featuredOfferBanners,
      offers_by_label: Object
        .values(offersByLabelMap)
        .sort((a, b) => (a.label_order || 0) - (b.label_order || 0)),
      shops: shopsWithMilestones
    });

  } catch (error) {
    console.error(error);
    return res.status(200).json({
      error: true,
      message: error.message || 'Something went wrong'
    });
  }
};


// const homeScreenData = async (req, res) => {
//   try {
//     const { _id: customerId } = req.user;
//     const now = new Date();
//     const currentMonth = dayjs().format("MMMM").toLowerCase();
//     const currentYear = dayjs().format("YYYY");

//     // --- Counts ---
//     const favouriteCount = await favouriteOffer.countDocuments({ customer_id: customerId });
//     const notesCount = await notesModel.countDocuments({ customer_id: customerId });

//     // --- Featured Offer Banners ---
//     const featuredOfferBanners = await offerModel.find({
//       offer_start: { $lte: now },
//       offer_expiry: { $gte: now },
//       is_hidden: false,
//       is_featured: true
//     }).select("_id offer_banner");

//     // --- Fetch all labels ---
//     const allLabels = await labelModel.find().sort({ order: 1 }).lean();

//     // --- Offers grouped by label ---
//     const offers = await offerModel
//       .find({ offer_start: { $lte: now }, offer_expiry: { $gte: now }, is_hidden: false })
//       .populate("label_id", ["title", "order", "is_featured", "is_shop"])
//       .lean();

//     const favouriteOffers = await favouriteOffer.find({ customer_id: customerId }).select("offer_id").lean();
//     const favouriteSet = new Set(favouriteOffers.map(fav => fav.offer_id.toString()));

//     // Build empty offersByLabel for every label
//     const offersByLabel = {};
//     allLabels.forEach(label => {
//       offersByLabel[label._id.toString()] = {
//         label_id: label._id,
//         label_name: label.title,
//         label_order: label.order,
//         is_featured: label.is_featured,
//         is_shop: label.is_shop,
//         offers: []
//       };
//     });

//     // Add offers into corresponding label bucket
//     offers.forEach(offer => {
//       const labelId = offer.label_id?._id?.toString();
//       const highestReward = offer.product_details?.reduce(
//         (max, pd) => (pd.reward > max ? pd.reward : max),
//         0
//       ) || 0;

//       if (labelId && offersByLabel[labelId]) {
//         offersByLabel[labelId].offers.push({
//           offer_id: offer._id,
//           offer_title: offer.offer_title,
//           order: offer.order,
//           highest_reward: highestReward,
//           favourite: favouriteSet.has(offer._id.toString()),
//           offer_display: offer.offer_display || null
//         });
//       } else {
//         // If offer has no label, put into "Unlabeled"
//         if (!offersByLabel["unlabeled"]) {
//           offersByLabel["unlabeled"] = {
//             label_id: "",
//             label_name: "All Offers",
//             label_order: 9999,
//             offers: []
//           };
//         }
//         offersByLabel["unlabeled"].offers.push({
//           offer_id: offer._id,
//           offer_title: offer.offer_title,
//           order: offer.order,
//           highest_reward: highestReward,
//           favourite: favouriteSet.has(offer._id.toString()),
//           offer_display: offer.offer_display || null
//         });
//       }
//     });

//     // --- Shops with simplified milestone progress ---
//     const shops = await shopModel.find({
//       is_dark: { $ne: true } 
//     }).lean();
//     const customer = await customersModel.findById(customerId).lean();

//     const shopsWithMilestones = shops.map(shop => {
//       const spentEntry = customer.spent_amount?.find(
//         s => String(s.shop_id) === String(shop._id) &&
//              s.month === currentMonth &&
//              s.year === currentYear
//       );
//       const currentAmount = spentEntry ? spentEntry.amount : 0;

//       const milestones = shop.milestone_rewards?.sort((a, b) => a.amount - b.amount) || [];

//       let nextMilestone = milestones.find(m => m.amount > currentAmount);
//       if (!nextMilestone && milestones.length > 0) {
//         nextMilestone = milestones[milestones.length - 1];
//       }

//       return {
//         shop_id: shop._id,
//         shop_name: shop.shop_name,
//         shop_logo: shop.shop_logo,
//         currentAmount,
//         progress: nextMilestone
//           ? Math.min(Math.round((currentAmount / nextMilestone.amount) * 100), 100)
//           : 100,
//         nextMilestone: nextMilestone
//           ? {
//               milestoneAmount: nextMilestone.amount,
//               milestoneReward: nextMilestone.reward,
//               amountToReach: Math.max(nextMilestone.amount - currentAmount, 0)
//             }
//           : null,
//       };
//     });

// //     // --- Sort offers inside each label ---
// // Object.values(offersByLabel).forEach(label => {
// //   label.offers.sort((a, b) => (a.order || 0) - (b.order || 0));
// // });

// // --- Sort offers inside each label ---
// Object.values(offersByLabel).forEach(label => {
//   label.offers.sort((a, b) => (a.order || 0) - (b.order || 0));
//   label.offers = label.offers.slice(0, 10);
// });

//     // --- Response ---
//     return res.status(200).json({
//       error: false,
//       message: "Home screen data fetched successfully",
//       counts: {
//         favourite_count: favouriteCount,
//         notes_count: notesCount
//       },
//       featured_offer_banners: featuredOfferBanners,
//       offers_by_label: Object.values(offersByLabel).sort((a, b) => a.label_order - b.label_order),
//       shops: shopsWithMilestones
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(200).json({
//       error: true,
//       message: error.message || "Something went wrong"
//     });
//   }
// };


const getBackendUrl = async (req, res) => {
  try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
          return res.status(200).json({
              error: true,
              title: result.errors[0].msg,
              errors: result,
          });
      }
      
      const backendUrl = await backendUrlModel.find({}).sort({createdAt: -1});

      return res.status(200).json({
          error: false,
          message: "Backend Url fetched successfully",
          backendUrl
      });
  } catch (error) {
      console.error(error);
      return res.status(200).json({
          error: true,
          message: error.message || "Something went wrong",
      });
  }
};




module.exports = {
  login,
  resendOtp,
  verifyOtp,
  updateCustomer,
  updateCustomerName,
  updateCustomerAddress,
  listAddresses,
  aboutCustomer,
  addReferral,
  editAddress,
  deleteAddress,
  customerListingAdmin,
  logout,
  updateBankDetails,
  customerDetails,
  addManualReward,
  sendOTP,
  deleteMyAccount,
  enableDisableCustomer,
  redirectApp,
  versionCheck,
  personalisedDeals,
  verifyReferralQR,
  getAllLabels,
  getLabelOffers,
  totalCoinsRedeemed,
  rewardsTab,
  getAllRewards,
  getAllRewardsForShop,
  homeScreenData,
  getBackendUrl
};
