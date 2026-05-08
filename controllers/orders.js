const orderModel = require("../models/order");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const {
  generateOrderNumber,
  sendPushNotification,
  sendEmail,
  generatePdfFromHtml,
} = require("../lib/helper");
const cartModel = require("../models/cart");
const productModel = require("../models/product");
const customerModel = require("../models/customer");
const addressModel = require("../models/address");
const offerModel = require("../models/offer");
const shopModel = require("../models/shop");
const redeemModel = require("../models/redeem");
const { validationResult } = require("express-validator");
const companyModel = require("../models/company");
const dayjs = require("dayjs");
const Razorpay = require("razorpay");
const walletTransaction = require("../models/walletTransaction");
const orderRewardBreakdownModel = require("../models/orderRewardBreakdown");
// const razorpayInstance = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });
const systemConfigModel = require("../models/systemConfig");

const orderListing = async (req, res) => {
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
    const { search, page, limit } = req.query;
    let skip = (page - 1) * limit;
    if (search) {
      const regex = new RegExp(search, "i");
      const orderData = await orderModel.find({
        order_no: regex,
        customer_id: _id,
      });
      const shopData = await shopModel.find();
      return res
        .status(200)
        .json({ message: "Successfully fetched data", error: false, orderData, shopData });
    }
    const orderData = await orderModel
      .find({ customer_id: _id })
      .sort({ createdAt: "desc" })
      .skip(skip)
      .limit(limit);
    const shopData = await shopModel.find();
    return res
      .status(200)
      .json({ message: "Successfully switched data", error: false , orderData, shopData });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

// const orderListingAdmin = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }
//     const { order_no, order_status, id } = req.query;

//     if (order_no) {
//       const regex = new RegExp(order_no, 'i');
//       const orderData = await orderModel.aggregate(
//         [
//           {
//             '$lookup': {
//               'from': 'customers',
//               'localField': 'customer_id',
//               'foreignField': '_id',
//               'as': 'customer'
//             }
//           }, {
//             $match: {
//               $and: [
//                 {
//                   $or: [
//                     { order_no: { $regex: regex } },
//                     { "customer.name": { $regex: regex } },
//                     { "customer.phone_no": { $regex: regex } }
//                   ]
//                 },
//                 { order_status: order_status }
//               ]
//             }
//           }
//         ]
//       )

//       const productData = await productModel.find({});
//       const customerData = await customerModel.find({});

//       return res.status(200).json({
//         message: "Successfully fetched data",
//         error: false, 
//         orderData,
//         customerData,
//         productData,
//       });
//     }
//     else if (id) {
//       const orderData = await orderModel
//         .find({ customer_id: id })
//         .populate("customer_id")
//         .sort({ createdAt: "desc" });
//       const productData = await productModel.find({});
//       return res.status(200).json({
//         message: "Successfully fetched data",
//         error: false, 
//         orderData,
//         productData,
//       });
//     } else {
//       const orderData = await orderModel
//         .find({
//           order_status: order_status,
//           ...(order_status === "placed" && { is_offline: false }),
//         })
//         .sort({ createdAt: "desc" });
//       const customerData = await customerModel.find({});
//       const productData = await productModel.find({});
//       return res.status(200).json({
//         message: "Successfully fetched data",
//         error: false, 
//         orderData,
//         customerData,
//         productData,
//       });
//     }
//   } catch (error) {
//     return res.status(200).json({
//       message: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };

const orderListingAdmin = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    let {
      order_no,
      order_status,
      customer_id,
      page = 1,
      limit = 10,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const baseMatch = {
      ...(order_status ? { order_status } : {}),
      ...(customer_id ? { customer_id: new mongoose.Types.ObjectId(customer_id) } : {}),
    };

    const searchMatch =
      order_no
        ? {
            $or: [
              { order_no: { $regex: order_no, $options: "i" } },
              { "customer.name": { $regex: order_no, $options: "i" } },
              { "customer.first_name": { $regex: order_no, $options: "i" } },
              { "customer.last_name": { $regex: order_no, $options: "i" } },
              { "customer.phone_no": { $regex: order_no, $options: "i" } },
            ],
          }
        : {};

    /* =========================
       MAIN DATA PIPELINE
    ========================= */
    const dataPipeline = [
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
        $match: {
          ...baseMatch,
          ...searchMatch,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    /* =========================
       COUNT PIPELINE
    ========================= */
    const countPipeline = [
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
        $match: {
          ...baseMatch,
          ...searchMatch,
        },
      },
      { $count: "total" },
    ];

    const [orderData, countResult] = await Promise.all([
      orderModel.aggregate(dataPipeline),
      orderModel.aggregate(countPipeline),
    ]);
    

    const totalCount = countResult[0]?.total || 0;

    return res.status(200).json({
      message: "Successfully fetched data",
      error: false,
      orderData,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const orderListingMeta = async (req, res) => {
  try {

    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const [customers, products] = await Promise.all([
      customerModel.find({}, {
        first_name: 1,
        last_name: 1,
        phone_no: 1
      }),
      productModel.find({}, {
        name: 1,
        price: 1
      })
    ]);

    return res.status(200).json({
      error: false,
      customers,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message || "Failed to fetch meta data",
    });
  }
};



const addOrder = async (req, res) => {
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
    const { start_time, end_time, address_id, total_reward } = req.body;
    const customerData = await customerModel.findById(_id);
    const addressData = await addressModel.findById(address_id);
    const cartData = await cartModel
      .findOne({ customer_id: _id })
      .select(["products", "shop_id"]);
    const shop = await shopModel.findById(cartData.shop_id);
    let offerIds = [];
    // if (shop) {
    //   const groupedData = cartData.products.reduce((result, item) => {
    //     const companyId = item.company_id;
    //     if (!result[companyId]) {
    //       result[companyId] = [];
    //     }

    //     result[companyId].push(item);

    //     return result;
    //   }, {});
    //   for (let [companyId, companyData] of Object.entries(groupedData)) {
    //     let reward = 0;
    //     let offerId = "";
    //     for (let pro of companyData) {
    //       const offer = await offerModel.findOne({
    //         "product_details.product_id": new ObjectId(pro.product_id),
    //       });
    //       if (offer) {
    //         const redeem = await redeemModel.countDocuments({
    //           offer_id: offer._id,
    //           customer_id: _id,
    //         });
    //         if (offer.redeem_limit > redeem) {
    //           let today = new Date();
    //           let startDate = offer.offer_start;
    //           let expiryDate = dayjs(offer.offer_expiry).add(1, "day");
    //           if (
    //             dayjs(today).isSameOrAfter(startDate) &&
    //             dayjs(today).isBefore(expiryDate)
    //           ) {
    //             for (let product of offer.product_details) {
    //               if (String(product.product_id) == String(pro.product_id)) {
    //                 if (product.reward > reward) {
    //                   reward = product.reward;
    //                   companyData.map((val) => (val.reward = 0));
    //                   pro.reward = reward;
    //                 } else {
    //                   pro.reward = 0;
    //                 }
    //               }
    //             }
    //           }
    //           offerId = offer._id;
    //           if (!offerIds.includes(String(offerId))) {
    //             offerIds.push(String(offerId));
    //           }
    //         }
    //       }
    //     }
    //   }
    // }
    if (shop) {
      let productOffers = {};
      for (let product of cartData.products) {
        const offer = await offerModel.findOne({
          "product_details.product_id": new ObjectId(product.product_id),
        });
        if (offer) {
          if (productOffers[offer._id]) {
            productOffers[offer._id].products.push(product);
          } else {
            productOffers[offer._id] = {
              offerDetails: offer,
              products: [product],
            };
          }
        }
      }
      for (let [offerId, groupedData] of Object.entries(productOffers)) {
        let reward = 0;
        for (let product of groupedData.products) {
          const redeem = await redeemModel.countDocuments({
            offer_id: new ObjectId(offerId),
            customer_id: _id,
          });
          console.log(groupedData.offerDetails.redeem_limit, redeem)
          if (groupedData.offerDetails.redeem_limit > redeem) {
            let today = new Date();
            let startDate = groupedData.offerDetails.offer_start;
            let expiryDate = dayjs(groupedData.offerDetails.offer_expiry).add(
              1,
              "day"
            );
            if (
              dayjs(today).isSameOrAfter(startDate) &&
              dayjs(today).isBefore(expiryDate)
            ) {
              for (let pro of groupedData.offerDetails.product_details) {
                if (String(product.product_id) == String(pro.product_id)) {
                  if (product.reward > reward) {
                    reward = pro.reward;
                    companyData.products.map((val) => (val.reward = 0));
                    pro.reward = reward;
                  } else {
                    pro.reward = 0;
                  }
                }
              }
              if (!offerIds.includes(String(offerId))) {
                offerIds.push(String(offerId));
              }
            }
          }
        }
      }
    }
    let order_no = "";
    let loop = true;
    let orderData = {};
    while (loop) {
      const lastOrder = await orderModel
        .findOne({})
        .sort({ createdAt: "desc" });
      order_no = generateOrderNumber(lastOrder);
      try {
        let order = new orderModel({
          order_no: order_no,
          order_status: "placed",
          order_details: cartData.products ? cartData.products : [],
          slot: { start_time: start_time, end_time: end_time },
          total_reward: total_reward ? total_reward : 0,
          address_id: address_id,
          shop_id: cartData.shop_id,
          shop: shop && shop.shop_name ? shop.shop_name : "",
          customer_id: _id,
          order_log: [
            {
              status: "placed",
              updatedAt: new Date(),
            },
          ],
          offers: offerIds,
          payment_status: "pending",
          paid_to_shopkeeper: false,
          payout_in_progress: false,
        });
        orderData = await order.save();
        loop = false;
      } catch (error) {
        if (error.code === 11000) {
          loop = true;
        } else {
          loop = false;
          return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
          });
        }
      }
    }

    const redeem = new redeemModel({
      customer_id: _id,
      order_id: orderData._id,
      offer_id: offerIds,
    });
    await redeem.save();

    const productArr = cartData.products.map((val, index) => {
      let products = [];
      products.push(index + 1);
      products.push(val.product_name);
      products.push(`${val.quantity}${val.unit}`);
      products.push(val.count);
      return products;
    });


    let data = {
      name: customerData.name,
      order_no: order_no,
      shop_id: shop._id,
      shop_name: shop.shop_name,
      shop_address: `${shop.street},${shop.zip_code},${shop.city},${shop.state}`,
      address: `${addressData.flat},${addressData.area}`,
      phone_no: `91${customerData.phone_no}`,
      // slot : `${dayjs(start_time).format("DD-MM-YYYY hh a")} - ${dayjs(end_time).format("hh a")}`,
      start_time: start_time,
      end_time: end_time,
      products: productArr,
    };

    generatePdfFromHtml(data);
    await cartModel.deleteOne({ customer_id: _id });
    return res.status(200).json({ message: "Successfully placed your order" , error: false });
  } catch (error) {
    console.log(error, "error")
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const updateOrderByAdmin = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { id, order_details, order_status, total_cost } = req.body;
    const order = await orderModel.findOne({ _id: id }).populate("customer_id");
    if (!order || order.order_status != "received") {
      return res.status(200).json({ error: true, message: "Order not found" });
    }
    await orderModel.findByIdAndUpdate(id, {
      order_status: order_status,
      order_details: order_details,
      total_cost: total_cost,
      $push: { order_log: { status: order_status, updatedAt: new Date() } },
    });
    if (order_status == "approved") {
      if (
        order &&
        order.customer_id &&
        order.customer_id.device_token &&
        order.customer_id.device_token.length > 0
      ) {
        const title = "ORDER APPROVED";
        const body = String(order._id);
        const not_body = `Your ShopKya order of ₹${total_cost} from ${order.shop} has been approved. Your order number is #${order.order_no}.`;

        // for (const token of order.customer_id.device_token) {
        //   await sendPushNotification(token, title, body, not_body);
        // }
      }
      var mailData = {
        email: order.customer_id.email,
        templateId: "d-1f06b17e0bfb44a385747657b883e05a",
        dynamic_template_data: {
          name: order.customer_id.name,
          msg1: `Your ShopKya order from ${order.shop} has been approved. Your order number is #${order.order_no}.`,
          subject: `Order approved`,
        },
      };

      // await sendEmail(mailData);
    }

    return res.status(200).json({ message: "Successfully updated order" , error: false });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

// const approveOrder = async (req, res) => {
//     try {
//         const result = validationResult(req);
//         if (result.errors.length > 0) {
//             return res.status(200).json({
//                 error: true,
//                 title: result.errors[0].msg,
//                 errors: result,
//             });
//         }
//         const { id, order_status, product_id, quantity, cost, reward} = req.body
//         await orderModel.updateOne(
//           { _id: new ObjectId(id) },
//           {
//             $set: {
//               "order_details.$[x].quantity": quantity,
//               "order_details.$[x].cost": cost,
//               "order_details.$[x].reward": reward,
//               order_status: order_status,
//             },
//           },
//           { arrayFilters: [{ "x.product_id": new ObjectId(product_id) }] }
//         );
//         res.status(200).json({message:'Successfully updated order'})
//     } catch (error) {
//         return res.status(200).json({
//             title: error.message || "Something went wrong",
//             error: true,
//         });
//     }
// }

// const confirmOrder = async (req, res) => {
//     try {
//         const result = validationResult(req);
//         if (result.errors.length > 0) {
//             return res.status(200).json({
//                 error: true,
//                 title: result.errors[0].msg,
//                 errors: result,
//             });
//         }
//         const { order_status , id } = req.body
//         await orderModel.findByIdAndUpdate(id,{order_status:order_status})
//         res.status(200).json({message:'Your order is confirmed'})
//     } catch (error) {
//         return res.status(200).json({
//             title: error.message || "Something went wrong",
//             error: true,
//         });
//     }
// }

const completeOrder = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { order_status, order_id } = req.body;
    const order = await orderModel
      .findOne({ _id: order_id })
      .populate("customer_id");
    if (
      !order ||
      (order_status == "out for delivery" &&
        order.order_status != "confirmed") ||
      (order_status == "cancelled" &&
        order.order_status != "placed" &&
        order_status == "cancelled" &&
        order.order_status != "approved") ||
      (order_status == "completed" && order.order_status != "out for delivery")
    ) {
      return res.status(200).json({ error: true, message: "Order not found" });
    }

    const orderData = await orderModel.findByIdAndUpdate(order_id, {
      order_status: order_status,
      $push: { order_log: { status: order_status, updatedAt: new Date() } },
    });

    if (order_status == "completed") {
      await customerModel.findOneAndUpdate(
        { _id: orderData.customer_id },
        {
          $inc: {
            rewards:
              orderData && orderData.total_reward ? orderData.total_reward : 0,
          },
        }
      );
      const numberOfOrders = await orderModel.countDocuments({ customer_id: orderData.customer_id, order_status: "completed" })
      if (numberOfOrders == 1) {
        const referredUser = await customerModel.findById(orderData.customer_id)
        if (referredUser.referred_by) {
          const referrer_rewards = await systemConfigModel.findOne({
            type: "referrer_rewards",
          });

          const referrer = await customerModel.findOneAndUpdate(referredUser.referred_by, {
            $inc: {
              rewards:
                referrer_rewards && referrer_rewards.reward
                  ? referrer_rewards.reward
                  : 0,
            }
          })

          if (
            referrer &&
            referrer.device_token &&
            referrer.device_token.length > 0
          ) {
            const title = "Refferrer rewards"
            const body = "";
            const not_body = `Congratulations! Your referred user, ${order.customer_id.first_name}, has successfully completed their first order. Tap here to check your earned referrasl reward.\n\nKeep sharing and keep earning!`
            // for (const token of referrer.device_token) {
            //   await sendPushNotification(token, title, body, not_body);
            // }
          }

          await walletTransaction.create({
            customer_id: referrer._id,
            rewards:
              referrer_rewards && referrer_rewards.reward
                ? referrer_rewards.reward
                : 0,
            description: `Referred to ${referredUser._id}`,
          });

          const referred_rewards = await systemConfigModel.findOne({
            type: "referred_rewards",
          });

          await customerModel.findByIdAndUpdate(referredUser._id, {
            $inc: {
              rewards:
                referred_rewards && referred_rewards.reward
                  ? referred_rewards.reward
                  : 0,
            }
          })

          await walletTransaction.create({
            customer_id: referredUser._id,
            rewards:
              referred_rewards && referred_rewards.reward
                ? referred_rewards.reward
                : 0,
            description: `Referred by code ${referrer._id}`,
          });
        }
      }
      await walletTransaction.create({
        customer_id: orderData.customer_id,
        rewards:
          orderData && orderData.total_reward ? orderData.total_reward : 0,
        description: `order completed for order id ${orderData._id}`,
      });
    }

    if (order_status == "cancelled") {
      await redeemModel.findOneAndDelete({ order_id: orderData._id });
    }

    if (
      order &&
      order.customer_id &&
      order.customer_id.device_token &&
      order.customer_id.device_token.length > 0
    ) {
      const title =
        order_status == "cancelled"
          ? "ORDER CANCELLED"
          : order_status == "out for delivery"
            ? "ORDER OUT FOR DELIVERY"
            : "completed"
              ? "ORDER COMPLETED"
              : "";
      const body = String(order._id);
      const not_body =
        order_status == "cancelled"
          ? `Your ShopKya order #${order.order_no} from ${order.shop} has been cancelled.`
          : order_status == "out for delivery"
            ? `Your ShopKya order #${order.order_no} from ${order.shop} is out for delivery.`
            : "completed"
              ? `Your ShopKya order #${order.order_no} from ${order.shop} has been delivered.Hope you continue to have a great shopping and earning experience.`
              : "";
      // for (const token of order.customer_id.device_token) {
      //   await sendPushNotification(token, title, body, not_body);
      // }
    }
    var mailData = {
      email: order.customer_id.email,
      templateId: "d-1f06b17e0bfb44a385747657b883e05a",
      dynamic_template_data: {
        name: order.customer_id.name,
        msg1:
          order_status == "completed"
            ? `Your ShopKya order #${order.order_no} from ${order.shop} has been delivered.Hope you continue to have a great shopping and earning experience.`
            : `This is to inform you that your ShopKya order #${order.order_no} from ${order.shop} has been ${order_status}.`,
        subject: `Order ${order_status}`,
      },
    };

    // await sendEmail(mailData);
    return res.status(200).json({ message: `Your order is ${order_status}` , error: false});
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const orderDetails = async (req, res) => {
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
    const orderData = await orderModel.findById(id);
    const customerData = await customerModel.find({});
    const addressData = await addressModel.find({});
    const companyData = await companyModel.find({});
    return res.status(200).json({
      message: "Successfully fetched data",
      error: false, 
      orderData,
      customerData,
      addressData,
      companyData,
    });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const getOrderDetail = async (req, res) => {

  try {

    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { order_id } = req.query;

    if(!order_id){
      return res.status(200).json({ error: true , message: "order_id is required" });
    }

    const orderData = await orderModel.findById(order_id).populate("shop_id", "shop_name shop_logo");

    if(!orderData){
      return res.status(200).json({ error: true , message: "Order not found" });
    }

    const orderRewardBreakdown = await orderRewardBreakdownModel.findOne({order_id: order_id}).populate("offers.product_id", "product_name");

    // if(!orderRewardBreakdown){
    //   return res.status(200).json({ error: true , message: "OrderRewardBreakdown not found" });
    // }

    return res.status(200).json({
      error: false,
      message: "Successfully fetched data",
      orderData,
      orderRewardBreakdown
    });

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const deleteOrder = async (req, res) => {
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
    await orderModel.findByIdAndDelete(id);
    return res.status(200).json({ message: "Successfully deleted order" , error: false });
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

const webhookResponse = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { payload } = req.body;
    if (payload && payload.context && payload.context.gsId) {
      const orderPresent = await orderModel.findOne({
        msg_id: payload.context.gsId,
      });
      if (!orderPresent || orderPresent.order_status != "placed") {
        return res.send("Order not found");
      }
    }
    if (payload.type == "quick_reply") {
      if (payload.payload.text == "Confirm") {
        const order = await orderModel
          .findOneAndUpdate(
            { msg_id: payload.context.gsId },
            {
              order_status: "received",
              $push: {
                order_log: { status: "received", updatedAt: new Date() },
              },
            }
          )
          .populate("customer_id");
        if (
          order &&
          order.customer_id &&
          order.customer_id.device_token &&
          order.customer_id.device_token.length > 0
        ) {
          const title = "ORDER CONFIRMED";
          const body = String(order._id);
          const not_body = `Your ShopKya order from ${order.shop} has been confirmed. Your order number is #${order.order_no}.`;

          // for (const token of order.customer_id.device_token) {
          //   await sendPushNotification(token, title, body, not_body);
          // }
          var mailData = {
            email: "shopkya.bhavya@gmail.com",
            templateId: "d-1f06b17e0bfb44a385747657b883e05a",
            dynamic_template_data: {
              name: order.customer_id.name,
              msg1: `New order for ${order.shop} by ${order.customer_id.name} on ${order.createdAt} with order no. "${order.order_no}" is recieved for modification. Please Enter the amount for the order on the link given below.`,
              msg2: `http://admin.shopkya.in/orders/order-details?id=${order._id}&tab=1`,
              subject: `Order Accepted`,
            },
          };

        // await sendEmail(mailData);
      } 
    }
      if (payload.payload.text == "Modify") {
        const order = await orderModel
          .findOneAndUpdate(
            { msg_id: payload.context.gsId },
            {
              order_status: "received",
              is_modify: true,
              $push: {
                order_log: { status: "received", updatedAt: new Date() },
              },
            }
          )
          .populate("customer_id");

        var mailData = {
          email: "shopkya.bhavya@gmail.com",
          templateId: "d-1f06b17e0bfb44a385747657b883e05a",
          dynamic_template_data: {
            name: order.customer_id.name,
            msg1: `New order for ${order.shop} by ${order.customer_id.name} on ${order.createdAt} with order no. "${order.order_no}" is recieved for modification. Please update the products and enter amount for the order on the link given below`,
            msg2: `http://admin.shopkya.in/orders/order-details?id=${order._id}&tab=1`,
            subject: `Order modify`,
          },
        };

        // await sendEmail(mailData);
        }
    }
    return res.status(200).send();
    // if(payload.type == "failed"){

    // }
  } catch (error) {
    console.log(error);
    return res.status(500).send();
  }
};

const updateOrderByUser = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const { order_id, order_status } = req.body;
    const order = await orderModel.findById(order_id);

    if (!order || order.order_status != "approved") {
      return res.status(200).json({ error: true, message: "Order not found" });
    }
    await orderModel.findByIdAndUpdate(order_id, {
      order_status: order_status,
      $push: { order_log: { status: order_status, updatedAt: new Date() } },
    });

    return res.status(200).json({ message: `Order ${order_status}` , error: false});
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

module.exports = {
  orderListing,
  addOrder,
  // approveOrder,
  // confirmOrder,
  completeOrder,
  updateOrderByAdmin,
  orderListingAdmin,
  orderListingMeta,
  orderDetails,
  getOrderDetail,
  deleteOrder,
  webhookResponse,
  updateOrderByUser,
};
