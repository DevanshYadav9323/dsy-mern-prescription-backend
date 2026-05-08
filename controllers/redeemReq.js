const {validationResult} = require('express-validator');
const redeemReq = require('../models/redeemReq');
const redeem = require('../models/redeem');
const customerModel = require('../models/customer');
const shopModel = require('../models/shop');
const { sendEmail, sendPushNotification, sendWhatsappTemplate } = require('../lib/helper');
const walletTransaction = require("../models/walletTransaction");
const settlementModel = require("../models/settlement");
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const { generateRedeemReqNumber } = require("../lib/helper");

// Gupshup template — alerts the shop when a customer redeems coins in store.
// Body: "Hi! A customer has just redeemed coins at your store ..."
// Variables: {{1}} store, {{2}} customer, {{3}} coins, {{4}} discount ₹, {{5}} date/time
const SHOP_REDEEM_TEMPLATE_ID = "d01ee88d-ab24-48a5-a6fc-cdc6ae21705e";

// 100 coins = ₹1.
const COINS_PER_RUPEE = 100;

const notifyShopOnRedeem = ({ shop, customer, coins }) => {
    try {
        if (!SHOP_REDEEM_TEMPLATE_ID) return;
        const numbers = (shop?.phone_numbers || []).filter(
            (p) => p && p.is_whatsapp && p.number
        );
        if (numbers.length === 0) return;

        const customerName = [customer?.first_name, customer?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || "Customer";
        const discount = (Number(coins) / COINS_PER_RUPEE).toFixed(2);

        const params = [
            shop?.shop_name || "",
            customerName,
            String(coins),
            discount,
            dayjs().tz("Asia/Kolkata").format("DD-MM-YYYY HH:mm"),
        ];

        numbers.forEach((p) => {
            sendWhatsappTemplate(p.number, SHOP_REDEEM_TEMPLATE_ID, params);
        });
    } catch (err) {
        console.log("notifyShopOnRedeem error:", err.message);
    }
};

const requestRedeem = async (req,res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { coins } = req.body
        const { _id } = req.user
        const customer = await customerModel.findById(_id)
        if(customer.redeem_requested){
            return res.status(200).json({message:"Already requested" , error: true})
        }
        await redeemReq.create({
            customer_id: _id,
            coins: coins,
            upi: customer.upi
        })
        var mailData = {
            email: "shopkya.bhavya@gmail.com",
            templateId: "d-1f06b17e0bfb44a385747657b883e05a",
            dynamic_template_data: {
              name: "Admin",
              msg1: `${customer.first_name} submitted a redeem request for ${coins} coins on ${dayjs().format("DD-MM-YYYY HH:mm")}. Please review the details in the admin panel.`,
              subject: "Redeem request",
            },
        };
      
        // await sendEmail(mailData);
        await customerModel.findByIdAndUpdate(_id,{redeem_requested:true})
        return res.status(200).json({message:"Successfully placed a redeem request" , error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const redeemReqListing = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const redeemReqs = await redeemReq
      .find()
      .populate({ path: "customer_id", select: "first_name last_name phone_no" })
      .sort({ createdAt: "desc" })
      .lean(); 

    const filteredRedeemReqs = redeemReqs.filter(req => !req.shop_id);

    return res.status(200).json({
      message: "Successfully fetched redeem requests",
      error: false,
      redeemReqs: filteredRedeemReqs,
    });

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


const updateStatus = async (req,res) => {
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
        const redeemData = await redeemReq.findByIdAndUpdate(id,{status:"fulfilled"},{returnDocument:"after"}) 
        const customer = await customerModel.findByIdAndUpdate(redeemData.customer_id,{ $inc: { rewards: -(redeemData.coins)}, redeem_requested:false})
        if (customer && customer.device_token && customer.device_token.length > 0) {
            const title = "UPI Redemption Complete! ✨"
            const body = ""
            const not_body = `Coins converted successfully, check your UPI balance now!`
            for (const token of customer.device_token) {
                await sendPushNotification(token, title, body, not_body)
            }
          }
        await walletTransaction.create({
            customer_id: redeemData.customer_id,
            rewards:redeemData.coins,
            type: "debit",
            description: `Redeem request fulfilled`,
        });
        return res.status(200).json({message:"Successfully updated status", error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

// const scanToRedeem = async (req, res) => {
//     try {
//       const result = validationResult(req);
//       if (result.errors.length > 0) {
//         return res.status(200).json({
//           error: true,
//           title: result.errors[0].msg,
//           errors: result,
//         });
//       }
//       const {shop_id, coins} = req.body
//       const { _id } = req.user
//       const redeem = new redeemReq({
//         shop_id,
//         coins,
//         customer_id:_id,
//         status:"fulfilled"
//       })
//       const savedRedeem = await redeem.save()
//       await settlementModel.create({
//         shop_id,
//         customer_id:_id,
//         redeem_id:savedRedeem._id,
//         coins
//       })
//       await walletTransaction.create({
//         customer_id: _id,
//         rewards: coins,
//         description: `Scan redeem for shop ${shop_id}`,
//       });
//       const customer = await customerModel.findByIdAndUpdate(_id,{ $inc: { rewards: -coins}},{ new: true })

//       return res.status(200).json({message:"Redeem successful", rewards:customer.rewards})
//     } catch (error) {
//       return res.status(200).json({
//         title: error.message || "Something went wrong",
//         error: true,
//       });
//     }
// };

const scanToRedeem = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { shop_id, coins } = req.body;
    const { _id } = req.user;

    if (!coins || Number(coins) <= 0) {
      return res.status(200).json({
        error: true,
        message: "Invalid coin amount",
      });
    }

    const shop = await shopModel.findById(shop_id);
    if (!shop) {
      return res.status(200).json({
        error: true,
        message: "Shop not found",
      });
    }

    const customerCheck = await customerModel.findById(_id).select("rewards");
    if (!customerCheck) {
      return res.status(200).json({
        error: true,
        message: "Customer not found",
      });
    }
    if ((customerCheck.rewards || 0) < Number(coins)) {
      return res.status(200).json({
        error: true,
        message: "Insufficient coins",
      });
    }

    let loop = true;
    let redeem_req_no = "";

    while (loop) {
      const lastRedeem = await redeemReq.findOne({shop_id: {$exists: true}}).sort({ createdAt: -1 });
      redeem_req_no = generateRedeemReqNumber(lastRedeem);

      try {
        const redeem = new redeemReq({
          shop_id,
          coins,
          customer_id: _id,
          status: "fulfilled",
          redeem_req_no
        });

        const savedRedeem = await redeem.save();

        await settlementModel.create({
          shop_id,
          customer_id: _id,
          redeem_id: savedRedeem._id,
          coins
        });

        await walletTransaction.create({
          customer_id: _id,
          rewards: coins,
          type: "debit",
          description: `Scan redeem for shop ${shop_id}`,
        });

        const customer = await customerModel.findByIdAndUpdate(
          _id,
          { $inc: { rewards: -coins } },
          { new: true }
        );

        loop = false;

        if (customer && customer.device_token && customer.device_token.length > 0) {
          const title = "Rewards Unlocked! 🎊"
          const body = "";
          const not_body = `Coins from your bills turned into rewards—enjoy them now!`
          for (const token of customer.device_token) {
              await sendPushNotification(token, title, body, not_body)
          }
        }

        notifyShopOnRedeem({ shop, customer, coins, redeem_req_no });

        return res.status(200).json({
          message: "Redeem successful",
          rewards: customer.rewards,
          redeem_req_no,
          error: false,
        });

      } catch (err) {
        if (err.code === 11000) {
          loop = true; 
        } else {
          loop = false;
          return res.status(200).json({
            message: err.message || "Something went wrong",
            error: true,
          });
        }
      }
    }

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


module.exports = {
    requestRedeem,
    redeemReqListing,
    updateStatus,
    scanToRedeem
};
