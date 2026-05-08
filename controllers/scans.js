const { validationResult } = require("express-validator");
const customerModel = require("../models/customer");
const scanModel = require("../models/scan");
const companyModel = require("../models/company");
const productModel = require("../models/product");
const orderModel = require("../models/order");
const offerModel = require("../models/offer");
const shopModel = require("../models/shop");
const aliasModel = require("../models/alias");
const OrderRewardBreakdown = require("../models/orderRewardBreakdown");
const redeemRecordModel = require("../models/redeem_record");
const {
    generateOrderNumber,
    base64Upload,
    generateScanOrderNumber,
    sendEmail,
    sendPushNotification,
    sendMessage,
    insertAlias,
} = require("../lib/helper");
const dayjs = require("dayjs");
var isSameOrAfter = require("dayjs/plugin/isSameOrAfter");
dayjs.extend(isSameOrAfter);
const mongoose = require("mongoose");
const redeemModel = require("../models/redeem");
const systemConfigModel = require("../models/systemConfig");
const walletTransaction = require("../models/walletTransaction");
const axios = require("axios");
const ObjectId = mongoose.Types.ObjectId;
require("dotenv").config();
const AWS = require("aws-sdk");
const ID = process.env.AWS_ACCESS_KEY;
const SECRET = process.env.AWS_SECRET_KEY;
const REGION = process.env.AWS_REGION || "ap-south-1";
const BUCKET = process.env.AWS_BUCKET_NAME;

const TEXTRACT_ID = process.env.TEXTRACT_AWS_ACCESS_KEY;
const TEXTRACT_SECRET = process.env.TEXTRACT_AWS_SECRET_KEY;
const DB = process.env.db;
const ELIGIBLE_DARK_STORE_ID = "67bc58211e54cd0f9bfe137f";


const { parseExpenseDocument, parseLineItems, inferItemCountFromTextract, updateProductPriceLearning, inferNetBillAmount, cleanAmount, cleanQuantity } = require("../lib/helper");
const fs = require("fs");

const s3 = new AWS.S3({
    accessKeyId: ID,
    secretAccessKey: SECRET,
    region: "ap-south-1",
});

const textract = new AWS.Textract({
    region: "ap-south-1",
    accessKeyId: TEXTRACT_ID,
    secretAccessKey: TEXTRACT_SECRET,
});

const scanOrderListing = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const scanOrderData = await orderModel
            .find({ is_offline: true, order_status: "placed" })
            .populate("customer_id")
            .sort({ createdAt: "desc" });
        // const shopData = await shopModel.find({});

        res.status(200).json({
            message: "Sucessfully fetched data",
            error: false,
            scanOrderData,
            // shopData,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

const scanOrderListingForShop = async (req, res) => {
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

       
        const shop = await shopModel.findById(_id).select("shop_name");
        if (!shop) {
            return res.status(404).json({
                error: true,
                message: "Shop not found",
            });
        }

        const scanOrderDataRaw = await orderModel
            .find({
                is_offline: true,
                order_status: "completed",
                shop: shop.shop_name,
            })
            .populate("customer_id", ["name"])
            .sort({ createdAt: "desc" });

       
        // Mask names
        const scanOrderData = scanOrderDataRaw.map((order) => {
            if (order.customer_id?.name) {
                const name = order.customer_id.name;
                const maskedName = name.charAt(0) + "*".repeat(name.length - 1);
                order.customer_id.name = maskedName;
            }
            return order;
        });

        res.status(200).json({
            error: false,
            message: "Sucessfully fetched data",
            scanOrderData,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

// const addScanOrder = async (req, res) => {
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
//     const { bills } = req.body;
//     let urls = [];
//     for (let bill of bills) {
//       let no = Math.floor(1000000000 + Math.random() * 9000000000);
//       let img_url = base64Upload(
//         `scans/${_id}`,
//         `${no}.jpeg`,
//         "image/jpeg",
//         bill
//       );
//       urls.push(img_url);
//     }
//     let loop = true;
//     let order_no = ""
//     while (loop) {
//       const lastOrder = await orderModel
//         .findOne({})
//         .sort({ createdAt: "desc" });
//       order_no = await generateOrderNumber(lastOrder);
//       try {
//         const order = new orderModel({
//           order_no: order_no,
//           customer_id: _id,
//           bills: urls,
//           is_offline: true,
//           order_status: "placed",
//           order_log: [
//             {
//               status: "placed",
//               updatedAt: new Date(),
//             },
//           ],
//         });

//         await order.save();

//         loop = false;
//       } catch (error) {
//         if (error.code === 11000) {
//           loop = true;
//         } else {
//           loop = false;
//           return res.status(200).json({
//             message: error.message || "Something went wrong",
//             error: true,
//           });
//         }
//       }
//     }
//     const customerData = await customerModel.findById(_id)
//     var mailData = {
//       email: customerData.email,
//       templateId: "d-1f06b17e0bfb44a385747657b883e05a",
//       dynamic_template_data: {
//         name: customerData.name,
//         msg1: `This is to inform you that ShopKya has received your scan order request. Your scan order number is ${order_no}.`,
//         msg2: `We are currently reviewing the same. You will be notified with an update soon.`,
//         subject: `Order scanned`,
//       }
//     };
//     // await sendEmail(mailData);
//     var mailData = {
//       email: "shopkya.bhavya@gmail.com",
//       templateId: "d-1f06b17e0bfb44a385747657b883e05a",
//       dynamic_template_data: {
//         name: "Admin",
//         msg1: `This is to inform you that a new scan order was uploaded by ${customerData.name} on ${dayjs().format("DD-MM-YYYY HH:mm")} . The scan order number is ${order_no}.`,
//         subject: `Order scanned`,
//       }
//     };
//     // await sendEmail(mailData);
//     return res.status(200).json({ message: "Successfully created a scan order" , error: false });
//   } catch (error) {
//     return res.status(200).json({
//       message: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };

const addScanOrder = async (req, res) => {
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
        const { bills } = req.body;

        let urls = bills;

        let loop = true;
        let order_no = "";
        while (loop) {
            const lastOrder = await orderModel
                .findOne({})
                .sort({ createdAt: "desc" });
            order_no = await generateOrderNumber(lastOrder);

            try {
                const order = new orderModel({
                    order_no: order_no,
                    customer_id: _id,
                    bills: urls,
                    is_offline: true,
                    order_status: "placed",
                    textract_status: "processing",
                    order_log: [
                        {
                            status: "placed",
                            updatedAt: new Date(),
                        },
                    ],
                });

                await order.save();

                // await prefillAndSaveOrder(order, _id);

                // console.log("lambda url : " , process.env.PREFILL_LAMBDA_URL);
                // console.log("DB : " , DB);
                // console.log("region : " , REGION);
                // console.log("aws access key : " , process.env.AWS_ACCESS_KEY);
                // console.log("aws secret key : " , process.env.AWS_SECRET_KEY);
                // console.log("aws bucket name : " , process.env.AWS_BUCKET_NAME);
                // console.log("aws openai key : " , process.env.OPENAI_API_KEY);

                axios.post(
                    process.env.PREFILL_LAMBDA_URL,
                    {
                        order: order,
                        customer_id: _id,

                        env: {
                            MONGO_URI: DB,
                            AWS_REGION: REGION,
                            AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
                            AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
                            BUCKET: process.env.AWS_BUCKET_NAME,
                            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                            TEXTRACT_AWS_ACCESS_KEY: process.env.TEXTRACT_AWS_ACCESS_KEY,
                            TEXTRACT_AWS_SECRET_KEY: process.env.TEXTRACT_AWS_SECRET_KEY,
                        },

                    }
                ).catch(async (e) => {
                    console.log("Lambda invocation error:", e?.message);
                    await orderModel.findByIdAndUpdate(order._id, {
                        $set: { textract_status: "failed" },
                    });
                });

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

        const customerData = await customerModel.findById(_id);

        var mailData = {
            email: customerData.email,
            templateId: "d-1f06b17e0bfb44a385747657b883e05a",
            dynamic_template_data: {
                name: customerData.name,
                msg1: `This is to inform you that ShopKya has received your scan order request. Your scan order number is ${order_no}.`,
                msg2: `We are currently reviewing the same. You will be notified with an update soon.`,
                subject: `Order scanned`,
            },
        };
        // await sendEmail(mailData);

        var adminMailData = {
            email: "shopkya.bhavya@gmail.com",
            templateId: "d-1f06b17e0bfb44a385747657b883e05a",
            dynamic_template_data: {
                name: "Admin",
                msg1: `This is to inform you that a new scan order was uploaded by ${customerData.name
                    } on ${dayjs().format(
                        "DD-MM-YYYY HH:mm"
                    )} . The scan order number is ${order_no}.`,
                subject: `Order scanned`,
            },
        };
        // await sendEmail(adminMailData);

        return res.status(200).json({
            message: "Successfully created a scan order",
            error: false,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

const scanOrderDetails = async (req, res) => {
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
        const scanOrderData = await orderModel.findById(id);
        const customerData = scanOrderData
            ? await customerModel
                  .findById(scanOrderData.customer_id)
                  .select("first_name last_name phone_no email")
            : null;
        // const productData = await productModel.find({ is_hidden: false, is_deleted: false }).sort({ product_name: 1 });
        const offerData = await offerModel.find({});
        const companyData = await companyModel
            .find({})
            .sort({ company_name: 1 });
        const redeemData = await redeemModel.find({
            customer_id: scanOrderData.customer_id,
        });
        const shopData = await shopModel.find({});
        const systemConfigData = await systemConfigModel.findOne({
            type: "scan_rewards",
        });
        return res.status(200).json({
            message: "Successfully fetched data",
            error: false,
            scanOrderData,
            customerData,
            // productData,
            offerData,
            companyData,
            redeemData,
            shopData,
            systemConfigData,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

const scanOrderDetailsForShop = async (req, res) => {

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

        const scanOrderData = await orderModel
            .findById(id)
            .populate("customer_id", ["name"]);

        // Mask customer name if it exists
        if (scanOrderData?.customer_id?.name) {
            const name = scanOrderData.customer_id.name;
            const maskedName = name.charAt(0) + "*".repeat(name.length - 1);
            scanOrderData.customer_id.name = maskedName;
        }

        return res.status(200).json({
            error: false,
            message: "Successfully fetched data",
            scanOrderData,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

const saveScanOrder = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const currentYear = new Date().getFullYear();
        const {
            id,
            customer_id,
            shop,
            order_status,
            order_details,
            reason,
            amount,
            invoice_no,
            invoice_date,
            total_selling_price,
        } = req.body;
        const alreadyUploadedScan = await orderModel.findOne({
            invoice_no: invoice_no,
            _id: { $ne: id },
            shop: shop,
            $expr: {
                $eq: [{ $year: "$invoice_date" }, currentYear],
            },
        });
        if (alreadyUploadedScan) {
            return res
                .status(200)
                .json({
                    error: true,
                    message:
                        "Scan order with same invoice number already exists",
                });
        }
        if (!order_status) {
            await orderModel.findByIdAndUpdate(id, {
                order_details: order_details,
                shop: shop,
                total_amount: amount,
                total_selling_price: total_selling_price,
                invoice_date: invoice_date,
                invoice_no: invoice_no,
            });
            return res
                .status(200)
                .json({ message: "Successfully saved order", error: false });
        } else {
            const customer = await customerModel.findOne({
                _id: new ObjectId(customer_id),
            });

            let partnerShop = await shopModel.findOne({ shop_name: shop });

            if (!partnerShop) {
                partnerShop = await shopModel.create({
                    shop_name: shop,
                    is_dark: true,
                });
            }

            const isEligibleForShopRewards = !partnerShop.is_dark || String(partnerShop._id) === ELIGIBLE_DARK_STORE_ID;

            if (partnerShop && order_status == "completed") {

                // Update Product Pricing if Different
                await updateProductPriceLearning(order_details);

                for (const item of order_details) {
                    if (item.alias && item.alias.trim() !== "") {
                        await insertAlias({
                            product_name: item.product_name,
                            product_id: item.product_id,
                            alias: item.alias,
                        });
                    }
                }

                let productOffers = {};
                for (let product of order_details) {

                    const today = new Date();

                    // const offer = await offerModel.findOne({
                    //     "product_details.product_id": new ObjectId(
                    //         product.product_id
                    //     ),
                    //     offer_start: { $lte: today },
                    //     offer_expiry: { $gt: today },
                    // });

                    const offers = await offerModel.find({
                        "product_details.product_id": new ObjectId(product.product_id),
                        is_hidden: false,
                        offer_start: { $lte: today },
                        offer_expiry: { $gt: today },
                    });

                    // if (offer) {

                    //     // Check if Shop is eligible for rewards

                    //     if (
                    //         offer.shop_id &&
                    //         Array.isArray(offer.shop_id) &&
                    //         offer.shop_id.length > 0 &&
                    //         !offer.shop_id.some(id => String(id) === String(partnerShop._id))
                    //     ) {
                    //         continue;
                    //     }

                    //     if (productOffers[offer._id]) {
                    //         productOffers[offer._id].products.push(product);
                    //     } else {
                    //         productOffers[offer._id] = {
                    //             offerDetails: offer,
                    //             products: [product],
                    //         };
                    //     }
                    // }

                    for (const offer of offers) {

                        // shop-specific offer validation
                        if (offer.offer_type === "shop") {
                            if (!isEligibleForShopRewards) continue;
                            if (
                                Array.isArray(offer.shop_id) &&
                                offer.shop_id.length > 0 &&
                                !offer.shop_id.some(id => String(id) === String(partnerShop._id))
                            ) {
                                continue;
                            }
                        }

                        if (productOffers[offer._id]) {
                            productOffers[offer._id].products.push({
                                ...product,
                                reward: 0,
                                // rewards: 0,
                            });
                        } else {
                            productOffers[offer._id] = {
                                offerDetails: offer,
                                products: [{
                                    ...product,
                                    reward: 0,
                                    // rewards: 0,
                                }],
                            };
                        }
                    }

                }

                let totalReward = 0;
                let offerIds = [];
                for (let [offerId, companyData] of Object.entries(
                    productOffers
                )) {
                    let reward = 0;
                    // console.log("company data : " , companyData)
                    // let offerId = "";
                    for (let pro of companyData.products) {
                        const redeem = await redeemModel.countDocuments({
                            offer_id: new ObjectId(offerId),
                            customer_id: customer_id,
                        });
                        if (companyData.offerDetails.redeem_limit > redeem) {
                            let today = new Date();
                            let startDate =
                                companyData.offerDetails.offer_start;
                            let expiryDate = dayjs(
                                companyData.offerDetails.offer_expiry
                            );
                            if (
                                dayjs(today).isSameOrAfter(startDate) &&
                                dayjs(today).isBefore(expiryDate)
                            ) {
                                for (let product of companyData.offerDetails
                                    .product_details) {
                                    if (
                                        String(product.product_id) ==
                                        String(pro.product_id)
                                    ) {
                                        if (product.reward > reward) {
                                            reward = product.reward;
                                            companyData.products.map(
                                                (val) => (val.reward = 0)
                                            );
                                            pro.reward = reward;
                                        } else {
                                            pro.reward = 0;
                                        }
                                    }
                                }
                            }
                            if (!offerIds.some(id => String(id) === String(offerId))) {
                                offerIds.push(offerId);
                            }
                        }
                    }
                    totalReward += reward;
                }
                const systemScanRewards = await systemConfigModel.findOne({
                    type: "scan_rewards",
                });

                totalReward += systemScanRewards?.reward || 0;
                if (isEligibleForShopRewards) {
                    let shopReward = (partnerShop?.rewards || []).filter((val, i) => {
                        if (partnerShop.rewards[i + 1]) {
                            if (
                                amount >= val.amount &&
                                amount < partnerShop.rewards[i + 1].amount
                            ) {
                                return true;
                            }
                        } else if (amount >= val.amount) {
                            return true;
                        } else {
                            return false;
                        }
                    });
                    totalReward +=
                        shopReward[0] && shopReward[0].reward
                            ? shopReward[0].reward
                            : 0;
                }

                let milestoneRewardToGive = 0;
                let milestoneAchieved = [];
                let invoiceMonth = "";
                let invoiceYear = "";

                if (isEligibleForShopRewards) {
                    invoiceMonth = dayjs(invoice_date).format("MMMM").toLowerCase();
                    invoiceYear = dayjs(invoice_date).format("YYYY");

                    const spentOnShop = customer?.spent_amount?.filter(
                        (val) =>
                            String(val.shop_id) === String(partnerShop._id) &&
                            val.month === invoiceMonth &&
                            val.year === invoiceYear
                    );

                    // Sort milestones ascending by spend threshold
                    const milestones = [...(partnerShop?.milestone_rewards || [])].sort(
                        (a, b) => a.amount - b.amount
                    );

                    const previousSpent = spentOnShop?.[0]?.amount || 0;
                    const newTotalSpent = previousSpent + amount;

                    // Find the highest milestone already achieved
                    let prevMilestone = milestones.reduce((acc, m) => {
                        return previousSpent >= m.amount ? m : acc;
                    }, null);

                    // Find the highest milestone now achieved
                    let newMilestone = milestones.reduce((acc, m) => {
                        return newTotalSpent >= m.amount ? m : acc;
                    }, null);

                    // If a new milestone is reached
                    if (
                        newMilestone &&
                        (!prevMilestone ||
                            newMilestone.amount > prevMilestone.amount)
                    ) {
                        const prevReward = prevMilestone ? prevMilestone.reward : 0;
                        milestoneRewardToGive = newMilestone.reward - prevReward;

                        // Record all milestones crossed in one go
                        milestoneAchieved = milestones
                            .filter(
                                (m) =>
                                    m.amount > (prevMilestone?.amount || 0) &&
                                    m.amount <= newMilestone.amount
                            )
                            .map((m) => ({
                                id: m._id,
                                amount: m.amount,
                                reward: m.reward,
                            }));

                        totalReward += milestoneRewardToGive;
                    }
                }


                // Rebuild per-product rewards from the server's own offer match
                // so products not matched to an active, eligible offer cannot carry
                // client-supplied reward values. For products that did win an offer,
                // sum the winning rewards across offers (mirrors how totalReward is
                // accumulated via per-offer `reward` above).
                const productRewardMap = {};
                for (const companyData of Object.values(productOffers)) {
                    for (const pro of companyData.products) {
                        if (pro.reward && pro.reward > 0) {
                            const key = String(pro.product_id);
                            productRewardMap[key] =
                                (productRewardMap[key] || 0) + pro.reward;
                        }
                    }
                }
                const sanitizedOrderDetails = (order_details || []).map((od) => ({
                    ...od,
                    rewards: productRewardMap[String(od.product_id)] || 0,
                }));

                const orderData = await orderModel.findByIdAndUpdate(id, {
                    order_status: order_status,
                    shop: shop,
                    shop_id: partnerShop._id,
                    order_details: sanitizedOrderDetails,
                    customer_id: customer_id,
                    total_reward: totalReward,
                    $push: {
                        order_log: { status: order_status, updatedAt: new Date() }
                    },
                    offers: offerIds,
                    reason: reason ? reason : "",
                    total_amount: amount,
                    total_selling_price: total_selling_price,
                    invoice_date: invoice_date,
                    invoice_no: invoice_no,
                });

                const numberOfOrders = await orderModel.countDocuments({
                    customer_id: orderData.customer_id,
                    order_status: "completed",
                });
                if (numberOfOrders == 1) {
                    const referredUser = await customerModel.findById(
                        orderData.customer_id
                    );
                    if (referredUser.referred_by) {
                        const referrer_rewards =
                            await systemConfigModel.findOne({
                                type: "referrer_rewards",
                            });

                        const referrer = await customerModel.findOneAndUpdate(
                            { _id: referredUser.referred_by },
                            {
                                $inc: {
                                    rewards:
                                        referrer_rewards &&
                                            referrer_rewards.reward
                                            ? referrer_rewards.reward
                                            : 0,
                                },
                            }
                        );

                        if (
                            referrer &&
                            referrer.device_token &&
                            referrer.device_token.length > 0
                        ) {
                            const title = "Referrer rewards";
                            const body = "";
                            const not_body = `Congratulations! Your referred user, ${referredUser.name}, has successfully completed their first order. Tap here to check your earned referral reward.\n\nKeep sharing and keep earning!`;
                            for (const token of referrer.device_token) {
                                await sendPushNotification(
                                    token,
                                    title,
                                    body,
                                    not_body
                                );
                            }
                        }

                        await walletTransaction.create({
                            customer_id: referrer._id,
                            rewards:
                                referrer_rewards && referrer_rewards.reward
                                    ? referrer_rewards.reward
                                    : 0,
                            description: `Referred to ${referredUser._id}`,
                        });

                        const referred_rewards =
                            await systemConfigModel.findOne({
                                type: "referred_rewards",
                            });

                        await customerModel.findByIdAndUpdate(
                            referredUser._id,
                            {
                                $inc: {
                                    rewards:
                                        referred_rewards &&
                                            referred_rewards.reward
                                            ? referred_rewards.reward
                                            : 0,
                                },
                            }
                        );

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

                if (
                    customer &&
                    customer.device_token &&
                    customer.device_token.length > 0
                ) {
                    const title =
                        order_status == "completed"
                            ? "Yay! Your Bill’s Approved! 🎉"
                            : order_status == "cancelled"
                                ? "Oops! Bill Not Approved ⚠️"
                                : "";
                    const body = String(id);
                    const not_body =
                        order_status == "completed"
                            ? `Your approved bill earned coins—view them in Orders.`
                            : order_status == "cancelled"
                                ? "No coins this time—check Orders for details."
                                : "";

                    for (const token of customer.device_token) {
                        await sendPushNotification(
                            token,
                            title,
                            body,
                            not_body
                        );
                    }
                }

                var mailData = {
                    email: customer.email,
                    templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                    dynamic_template_data: {
                        name: customer.name,
                        msg1:
                            order_status == "completed"
                                ? "Congratulations! Your ShopKya scan order request has been approved. Check your rewards on our app now!"
                                : order_status == "cancelled"
                                    ? `Your ShopKya scan order request has been rejected because of ${reason}.`
                                    : "",
                        subject:
                            order_status == "cancelled"
                                ? "Scan order rejected"
                                : order_status == "completed"
                                    ? "Scan order completed"
                                    : "",
                    },
                };

                // await sendEmail(mailData);

                // if(order_status == "completed"){
                //   sendMessage(`Congratulations! Your ShopKya scan order request has been approved. Check your rewards on our app now! -ShopKya`, [customer.phone_no])
                // } else if(order_status == "cancelled"){
                //   sendMessage(`Hello,\n\nYour ShopKya scan order request has been rejected. Please contact us for more queries. -ShopKya`, [customer.phone_no])
                // }

                if (offerIds.length > 0) {
                    const redeem = new redeemModel({
                        customer_id: customer_id,
                        order_id: orderData._id,
                        offer_id: offerIds,
                    });
                    await redeem.save();
                }

                // Updating redeem_record collection
                if (offerIds.length > 0) {
                    for (const offerId of offerIds) {
                        const redeemRecord = new redeemRecordModel({
                            customer_id: customer_id,
                            offer_id: offerId,
                            redeemed_at: new Date(),
                            quantity: 1,
                        });
                        await redeemRecord.save();
                    }
                }

                // Update spent_amount only if shop is eligible and has milestone_rewards configured
                if (isEligibleForShopRewards && partnerShop.milestone_rewards && partnerShop.milestone_rewards.length > 0) {
                    const amountSpentOnShop = customer?.spent_amount?.find(
                        (val) =>
                            String(val.shop_id) === String(partnerShop._id) &&
                            val.month === invoiceMonth &&
                            val.year === invoiceYear
                    );

                    let updatedCustomer;

                if (amountSpentOnShop) {
                    updatedCustomer = await customerModel.findOneAndUpdate(
                        { _id: customer_id },
                        {
                            $inc: {
                                rewards: totalReward,
                                "spent_amount.$[elem].amount": amount,
                            },
                        },
                        {
                            arrayFilters: [
                                {
                                    "elem.shop_id": partnerShop._id,
                                    "elem.month": invoiceMonth,
                                    "elem.year": invoiceYear,
                                },
                            ],
                            new: true,
                        }
                    );
                } else {
                    updatedCustomer = await customerModel.findOneAndUpdate(
                        { _id: customer_id },
                        {
                            $inc: { rewards: totalReward },
                            $push: {
                                spent_amount: {
                                    shop_id: partnerShop._id,
                                    amount: amount,
                                    month: invoiceMonth,
                                    year: invoiceYear,
                                },
                            },
                        },
                        { upsert: true, new: true }
                    );
                }

                    // Remove older entries (keep only latest 2)
                    let shopEntries = updatedCustomer.spent_amount.filter(
                        (entry) => String(entry.shop_id) === String(partnerShop._id)
                    );

                    if (shopEntries.length > 2) {
                        shopEntries.sort((a, b) => {
                            const aDate = dayjs(`${a.month} ${a.year}`, "MMMM YYYY");
                            const bDate = dayjs(`${b.month} ${b.year}`, "MMMM YYYY");
                            return aDate.isAfter(bDate) ? -1 : 1;
                        });

                        const entriesToRemove = shopEntries.slice(
                            0,
                            shopEntries.length - 2
                        );
                        const removalConditions = entriesToRemove.map((e) => ({
                            shop_id: partnerShop._id,
                            month: e.month,
                            year: e.year,
                        }));

                        for (const cond of removalConditions) {
                            await customerModel.updateOne(
                                { _id: customer_id },
                                {
                                    $pull: {
                                        spent_amount: {
                                            shop_id: cond.shop_id,
                                            month: cond.month,
                                            year: cond.year,
                                        },
                                    },
                                }
                            );
                        }
                    }
                } else {
                    // No milestones — just credit rewards
                    await customerModel.findByIdAndUpdate(customer_id, {
                        $inc: { rewards: totalReward },
                    });
                }

                await walletTransaction.create({
                    customer_id: customer_id,
                    rewards: totalReward,
                    description: `scan order completed for order id ${orderData._id}`,
                });

                // Order Reward Breakdown

                // 1️⃣ Calculate parts
                // const milestoneRewardAmount = milestoneReward.reduce((sum, r) => sum + r.reward, 0);
                const milestoneRewardAmount = milestoneRewardToGive || 0;
                // const shopRewardAmount = shopReward[0]?.reward || 0;
                const scanRewardAmount = systemScanRewards?.reward || 0;

                // 2️⃣ Build offers array

                const offersArr = [];
                for (const [offerId, companyData] of Object.entries(
                    productOffers
                )) {
                    const offer = companyData.offerDetails;
                    const rewardedProduct = companyData.products.find(
                        (p) => p.reward && p.reward > 0
                    );

                    if (rewardedProduct) {
                        offersArr.push({
                            offer_id: offer._id,
                            company_id: offer.company_id,
                            reward: rewardedProduct.reward,
                            product_id: rewardedProduct.product_id,
                        });
                    }
                }

                let shopRewardAmount = 0;
                let shopHitsArr = [];

                if (isEligibleForShopRewards && partnerShop?.rewards?.length > 0) {
                    const matchedTier = partnerShop.rewards.find((tier, i) => {
                        if (partnerShop.rewards[i + 1]) {
                            return (
                                amount >= tier.amount &&
                                amount < partnerShop.rewards[i + 1].amount
                            );
                        } else {
                            return amount >= tier.amount;
                        }
                    });

                    if (matchedTier) {
                        shopRewardAmount = matchedTier.reward;
                        shopHitsArr.push({
                            amount: matchedTier.amount,
                            reward: matchedTier.reward,
                        });
                    }
                }

                const milestoneRewardsArr = milestoneAchieved
                    .map((r) => ({
                        _id: r._id,
                        amount: r.amount,
                        reward: r.reward,
                    }))
                    .sort((a, b) => a.amount - b.amount);

                // 3️⃣ Create single breakdown doc
                await OrderRewardBreakdown.create({
                    order_id: orderData._id,
                    customer_id: customer_id,
                    shop_id: partnerShop._id,
                    amount_spent: amount,
                    offers: offersArr,
                    order_rewards: {
                        shop_reward: shopRewardAmount,
                        milestone_reward: milestoneRewardAmount,
                        scan_reward: scanRewardAmount,
                    },
                    milestone_hits: milestoneRewardsArr,
                    shop_hits: shopHitsArr,
                });

                return res
                    .status(200)
                    .json({
                        message: "Successfully updated order",
                        error: false,
                    });
            } else {
                if (order_status == "cancelled") {
                    // Drop placeholder rows whose ObjectId fields are empty/invalid;
                    // keep matched line items so the admin's edits survive cancel.
                    const validOrderDetails = (order_details || []).filter(
                        (od) =>
                            od &&
                            ObjectId.isValid(od.product_id) &&
                            ObjectId.isValid(od.company_id)
                    );
                    await orderModel.findByIdAndUpdate(id, {
                        order_status: order_status,
                        customer_id: customer_id,
                        total_reward: 0,
                        order_details: validOrderDetails,
                        invoice_no: invoice_no,
                        invoice_date: invoice_date,
                        total_amount: amount,
                        $push: {
                            order_log: { status: order_status, updatedAt: new Date() }
                        },
                        reason: reason ? reason : "",
                    });
                }

                if (order_status == "completed") {
                    const systemScanRewards = await systemConfigModel.findOne({
                        type: "scan_rewards",
                    });

                    await orderModel.findByIdAndUpdate(id, {
                        order_status: order_status,
                        shop: shop,
                        shop_id: partnerShop._id,
                        order_details: order_details,
                        customer_id: customer_id,
                        total_reward: systemScanRewards.reward,
                        $push: {
                            order_log: { status: order_status, updatedAt: new Date() }
                        },
                        reason: reason ? reason : "",
                        total_amount: amount,
                        total_selling_price: total_selling_price,
                        invoice_date: invoice_date,
                        invoice_no: invoice_no,
                    });
                }

                const customer = await customerModel.findOne({
                    _id: new ObjectId(customer_id),
                });
                if (
                    customer &&
                    customer.device_token &&
                    customer.device_token.length > 0
                ) {
                    const title =
                        order_status == "completed"
                            ? "SCAN ORDER COMPLETED"
                            : order_status == "cancelled"
                                ? "SCAN ORDER REJECTED"
                                : "";
                    const body = String(id);
                    const not_body =
                        order_status == "completed"
                            ? `Congratulations! Your ShopKya scan order request has been approved. Check your rewards now!`
                            : order_status == "cancelled"
                                ? "Your ShopKya scan order request has been rejected."
                                : "";

                    for (const token of customer.device_token) {
                        await sendPushNotification(
                            token,
                            title,
                            body,
                            not_body
                        );
                    }
                }
                var mailData = {
                    email: customer.email,
                    templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                    dynamic_template_data: {
                        name: customer.name,
                        msg1:
                            order_status == "completed"
                                ? "Congratulations! Your ShopKya scan order request has been approved. Check your rewards on our app now!"
                                : order_status == "cancelled"
                                    ? `Your ShopKya scan order request has been rejected because of ${reason}.`
                                    : "",
                        subject:
                            order_status == "cancelled"
                                ? "Scan order rejected"
                                : order_status == "completed"
                                    ? "Scan order completed"
                                    : "",
                    },
                };

                // await sendEmail(mailData);
                return res
                    .status(200)
                    .json({
                        message: "Successfully updated order",
                        error: false,
                    });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

const deleteScanOrder = async (req, res) => {
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
        res.status(200).json({
            message: "Successfully deleted scan order",
            error: false,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

const deleteScanImage = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const { scanOrderId, imageUrl } = req.body;

        // extract key from full S3 url
        // e.g. https://s3.ap-south-1.amazonaws.com/<bucket>/scans/USER_ID/123.jpeg
        const urlParts = imageUrl.split("/");
        const keyIndex = urlParts.findIndex((p) => p === "scans");
        if (keyIndex === -1) {
            return res.status(200).json({
                error: true,
                message: "Invalid image URL format",
            });
        }
        const s3Key = urlParts.slice(keyIndex).join("/"); // scans/.../123.jpeg

        // delete file from S3
        await s3
            .deleteObject({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: s3Key,
            })
            .promise();

        console.log("Image deleted from S3");

        // Pull image from bills array
        const updatedOrder = await orderModel.findByIdAndUpdate(
            scanOrderId,
            { $pull: { bills: imageUrl } },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(200).json({
                error: true,
                message: "Order not found",
            });
        }

    return res.status(200).json({
      error: false,
      message: "Image removed successfully",
      // order: updatedOrder,
    });

  } catch (error) {
    console.error("Delete Scan Image Error:", error);
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

// ✅ Extract file key from S3 URL
// const extractKeyFromS3Url = (url) => {
//   // Example handled:
//   // https://my-bucket.s3.ap-south-1.amazonaws.com/uploads/invoice1.jpg
//   const match = url.match(/amazonaws\.com\/(.+)/);
//   return match ? decodeURIComponent(match[1]) : null;
// };

// const extractKeyFromS3Url = (url) => {
//     try {
//         const match = url.match(/amazonaws\.com\/(.+)$/);
//         return match ? decodeURIComponent(match[1]) : null;
//     } catch {
//         return null;
//     }
// };

const extractKeyFromS3Url = (url) => {
    try {
        const parsed = new URL(url);
        // pathname → "/shopkya-data/scans/...jpeg"
        const parts = parsed.pathname.split("/").filter(Boolean);

        // first segment = bucket
        parts.shift(); // remove "shopkya-data"

        // remaining parts = key
        return parts.join("/");
    } catch (err) {
        return null;
    }
};

// const extractKeyFromS3Url = (url) => {
//   try {
//     // Parse the URL
//     const u = new URL(url);
//     // URL pathname: /shopkya-data/scans/...
//     const pathParts = u.pathname.split("/");

//     // Remove the first part (bucket name)
//     pathParts.shift(); // removes empty string before first '/'
//     pathParts.shift(); // removes bucket name

//     // Join the rest as key
//     const key = pathParts.join("/");
//     return key;
//   } catch (err) {
//     return null;
//   }
// };

// const extractBillsData = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(200).json({
//         error: true,
//         title: errors.errors[0].msg,
//         errors: errors.array(),
//       });
//     }

//     const { bills } = req.body;
//     const results = [];

//     for (const url of bills) {
//       try {
//         const key = extractKeyFromS3Url(url);
//         console.log("key : " , key);
//         console.log("bucket: " , BUCKET);
//         if (!key) {
//           results.push({
//             source_url: url,
//             error: true,
//             message: "Invalid S3 URL — unable to extract file path.",
//           });
//           continue;
//         }

//         const params = {
//           Document: {
//             S3Object: {

//               Bucket: "infiny-staging",
//               Name: "image(1).jpg",

//               // Name: key,
//               // Bucket: BUCKET,

//             },
//           },
//         };

//         const textractResponse = await textract.analyzeExpense(params).promise();

//         const doc = textractResponse.ExpenseDocuments?.[0];

//         const headers = await parseExpenseDocument(doc);
//         const lineItems = await parseLineItems(doc);

//         await fs.writeFileSync("output.json", JSON.stringify(headers, null, 2));
//         await fs.writeFileSync("output_2.json", JSON.stringify(lineItems, null, 2));

//         // const extractedData = parseExpenseData(textractResponse);

//         results.push({
//           source_url: url,
//           header_data: headers,
//           line_items: lineItems,
//         });
//       } catch (err) {
//         results.push({
//           source_url: url,
//           error: true,
//           message: `Textract failed: ${err.message}`,
//         });

//         return res.status(200).json({
//           error: true,
//           message: "Failed to read bills",
//           data: results,
//         });

//       }
//     }

//     return res.status(200).json({
//       error: false,
//       message: "Successfully analyzed bills",
//       data: results,
//     });
//   } catch (error) {
//     console.error("❌ Textract Error:", error);
//     return res.status(200).json({
//       error: true,
//       message: error.message || "Something went wrong",
//     });
//   }
// };

// --- tiny utils ---
// const cleanAmount = (v) =>
//     Number(
//         String(v ?? "0")
//             .replace(/[₹Rs\s]/gi, "")
//             .replace(/,/g, "")
//     ) || 0;

//     function cleanQuantity(q) {
//         if (!q) return 1;
//         return (
//             Number(
//                 String(q)
//                     .replace(/[^0-9.]/g, "")
//                     .trim()
//             ) || 1
//         );
//     }    

// const parseDMY = (s) => {
//     if (!s) return undefined;
//     console.log("s" , s);
//     const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(String(s).trim());
//     if (!m) return undefined;
//     const [, d, mo, y] = m.map(Number);
//     const dt = new Date(y, mo - 1, d);
//     console.log("dt : " , dt);
//     return Number.isFinite(dt.getTime()) ? dt : undefined;
// };

const parseDMY = (s) => {
    if (!s) return undefined;

    const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/.exec(String(s).trim());
    if (!m) return undefined;

    let [, d, mo, yRaw] = m;
    d = Number(d);
    mo = Number(mo);

    // Convert 2-digit year to 2000-based
    let y = Number(yRaw);
    if (y < 100) y += 2000;

    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(dt.getTime()) ? dt : undefined;
};

// === Core bill analyzer (copied from your extractBillsData loop) ===
async function extractBillsCore(bills) {
    const rawDocs = [];

    // ---- PHASE 1: Extract Textract data ----
    for (const url of bills) {
        try {
            const key = extractKeyFromS3Url(url);
            if (!key) {
                rawDocs.push({ source_url: url, error: true, message: "Invalid S3 URL — unable to extract file path." });
                continue;
            }

            const params = {
                Document: { S3Object: { Bucket: BUCKET, Name: key } },
            };

            const textractResponse = await textract.analyzeExpense(params).promise();
            const doc = textractResponse.ExpenseDocuments?.[0];

            const headers = await parseExpenseDocument(doc);
            const lineItems = await parseLineItems(doc);

            console.log(
                "LINE ITEMS FULL:",
                JSON.stringify(lineItems, null, 2)
            );

            rawDocs.push({
                source_url: url,
                headers,
                lineItems,
            });
        } catch (err) {
            rawDocs.push({ source_url: url, error: true, message: `Textract failed: ${err.message}` });
        }
    }

    // ---- PHASE 2: Deduplicate/Normalize and Enrich ----
    // Flatten all line items across bills
    const allLineItems = rawDocs.flatMap(doc => doc.lineItems?.map(li => ({ ...li, source_url: doc.source_url })) || []);

    const enrichedLineItemsMap = {};

    for (const item of allLineItems) {
        let matchedProduct = null;
        const productName = item.ITEM?.trim();

        if (productName) {
            // --- Alias search
            const matchedAliasAgg = await aliasModel.aggregate([
                {
                    $search: {
                        index: "default",
                        compound: {
                            must: [
                                {
                                    text: {
                                        query: productName,
                                        path: "alias",
                                        fuzzy: { maxEdits: 2, prefixLength: 2 },
                                    },
                                },
                            ],
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        product_id: 1,
                        product_name: 1,
                        createdAt: 1,
                        match_score: { $meta: "searchScore" },
                    },
                },
                { $sort: { match_score: -1 } },
                { $limit: 3 },
            ]);

            if (matchedAliasAgg.length > 0) {
                const latestAlias = matchedAliasAgg.reduce((a, b) =>
                    new Date(a.createdAt) > new Date(b.createdAt) ? a : b
                );
                latestAlias.match_score += 10;
                const aliasDoc = matchedAliasAgg.sort((a, b) => b.match_score - a.match_score)[0];

                const productDoc = await productModel.findOne(
                    { _id: aliasDoc.product_id },
                    { company_id: 1, category_id: 1, unit: 1, product_image: 1, price: 1 }
                );

                matchedProduct = {
                    id: aliasDoc.product_id,
                    name: aliasDoc.product_name,
                    brand: productDoc?.company_id || null,
                    product_image: productDoc?.product_image || null,
                    unit: productDoc?.unit,
                    mrp: productDoc?.price || null,
                    category: productDoc?.category_id || null,
                    match_score: aliasDoc.match_score,
                };
            }
        }

        if (!enrichedLineItemsMap[item.source_url]) enrichedLineItemsMap[item.source_url] = [];
        enrichedLineItemsMap[item.source_url].push({ ...item, matched_product: matchedProduct });
    }

    // ---- Fuzzy match shops & build final results ----
    const finalResults = [];

    for (const doc of rawDocs) {
        if (doc.error) {
            finalResults.push(doc);
            continue;
        }

        const searchTerm =
            doc.headers?.VENDOR_NAME?.trim() ||
            doc.headers?.NAME?.trim() ||
            doc.headers?.VENDOR_ADDRESS?.split("\n")[0]?.trim();

        let matchedShop = null;
        if (searchTerm) {
            const searchResult = await shopModel.aggregate([
                {
                    $search: {
                        index: "default",
                        text: { query: searchTerm, path: ["shop_name"], fuzzy: { maxEdits: 2, prefixLength: 2 } },
                    },
                },
                { $limit: 1 },
                {
                    $project: {
                        _id: 1,
                        shop_name: 1,
                        phone_no: 1,
                        city: 1,
                        score: { $meta: "searchScore" },
                    },
                },
            ]);
            if (searchResult.length > 0) matchedShop = searchResult[0];
        }

        // --- Infer item count if needed
        let itemCountInfo = null;
        try {
            itemCountInfo = await inferItemCountFromTextract(doc.headers, doc.lineItems);
        } catch (e) {
            console.error("Failed to infer item count:", e);
        }

        finalResults.push({
            source_url: doc.source_url,
            header_data: {
                ...doc.headers,
                matched_shop: matchedShop
                    ? {
                        id: matchedShop._id,
                        name: matchedShop.shop_name,
                        phone: matchedShop.phone_no,
                        city: matchedShop.city,
                        match_score: matchedShop.score,
                    }
                    : null,
                item_count: itemCountInfo?.itemCount ?? null,
                item_count_confidence: itemCountInfo?.confidence ?? 0,
                item_count_source_key: itemCountInfo?.sourceKey ?? null,
            },
            line_items: enrichedLineItemsMap[doc.source_url] || [],
        });
    }

    return finalResults;
}
// async function extractBillsCore(bills) {
//     const results = [];

//     for (const url of bills) {
//         try {
//             const key = extractKeyFromS3Url(url);

//             console.log("KEY : ", key);
//             console.log("bucket : ", BUCKET);

//             if (!key) {
//                 results.push({
//                     source_url: url,
//                     error: true,
//                     message: "Invalid S3 URL — unable to extract file path.",
//                 });
//                 continue;
//             }

//             const params = {
//                 Document: {
//                     S3Object: {
//                         // Bucket: "infiny-staging",
//                         // Name: "image(1).jpg",
//                         // Bucket: "shopkya-data",
//                         Bucket: BUCKET,
//                         Name: key,
//                         // Name: "scans/684681a04faf7a16e1552fce/pushpa_shetty_blurred_bill.jpeg",
//                     },
//                 },
//             };

//             const textractResponse = await textract
//                 .analyzeExpense(params)
//                 .promise();

//             console.log("textractResponse : " , textractResponse);
//             // console.log("textractResponse FULL : ", 
//             //     JSON.stringify(textractResponse, null, 2)
//             //   );
//             const doc = textractResponse.ExpenseDocuments?.[0];

//             const headers = await parseExpenseDocument(doc);
//             const lineItems = await parseLineItems(doc);

//             let itemCountInfo = null;
//             try {
//                 itemCountInfo = await inferItemCountFromTextract(headers, lineItems);
//                 console.log("Inferred item count:", itemCountInfo);
//             } catch (e) {
//                 console.error("Failed to infer item count via OpenAI:", e);
//             }

//             console.log("headers : " , headers);
//             console.log("lineItems : " , lineItems);

//             // ---- fuzzy shop (same as your code)
//             let matchedShop = null;
//             const searchTerm =
//                 headers?.VENDOR_NAME?.trim() ||
//                 headers?.NAME?.trim() ||
//                 headers?.VENDOR_ADDRESS?.split("\n")[0]?.trim();

//             if (searchTerm) {
//                 const searchResult = await shopModel.aggregate([
//                     {
//                         $search: {
//                             index: "default",
//                             text: {
//                                 query: searchTerm,
//                                 path: ["shop_name"],
//                                 fuzzy: { maxEdits: 2, prefixLength: 2 },
//                             },
//                         },
//                     },
//                     { $limit: 1 },
//                     {
//                         $project: {
//                             _id: 1,
//                             shop_name: 1,
//                             phone_no: 1,
//                             city: 1,
//                             score: { $meta: "searchScore" },
//                         },
//                     },
//                 ]);
//                 if (searchResult.length > 0) matchedShop = searchResult[0];
//             }

//             const enrichedLineItems = [];

//             for (const item of lineItems) {
//                 let matchedProduct = null;
//                 const productName = item.ITEM?.trim();

//                 if (productName) {
//                     console.log("productName : ", productName);
//                     // Search alias collection with Atlas Search
//                     // const matchedAliasAgg = await aliasModel.aggregate([
//                     //     // {
//                     //     //     $search: {
//                     //     //         index: "default",
//                     //     //         text: {
//                     //     //             query: productName,
//                     //     //             //   query: "WINGREENS PIZ&PAST SAUCE 20",
//                     //     //             // query: "WINGOONS PIZZA&PASTA SAUCE 250gm",
//                     //     //             //   query: "Funfoods Pasta & Pizza Pink Sauce 295GM",
//                     //     //             //   query: "Funfoods Pasta&Pizza Pink Sauce 300",
//                     //     //             path: "alias",
//                     //     //             fuzzy: { maxEdits: 2, prefixLength: 2 },
//                     //     //         },
//                     //     //     },
//                     //     // },
//                     //     {
//                     //         $search: {
//                     //           index: "default",
//                     //           compound: {
//                     //             must: [
//                     //               {
//                     //                 text: {
//                     //                   query: productName,
//                     //                   path: "alias",
//                     //                   fuzzy: { maxEdits: 2, prefixLength: 2 },
//                     //                 }
//                     //               }
//                     //             ],
//                     //             should: [
//                     //               {
//                     //                 range: {
//                     //                   path: "createdAt",
//                     //                   gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),  // last 60 days
//                     //                   score: { boost: { value: 10 }}  // Boost new SKUs
//                     //                 }
//                     //               }
//                     //             ]
//                     //           }
//                     //         }
//                     //       },
//                     //     {
//                     //         $project: {
//                     //             _id: 0,
//                     //             product_id: 1,
//                     //             product_name: 1,
//                     //             match_score: { $meta: "searchScore" },
//                     //         },
//                     //     },
//                     //     { $sort: { match_score: -1 } },
//                     //     { $limit: 3 },
//                     // ]);

//                     const matchedAliasAgg = await aliasModel.aggregate([
//                         {
//                             $search: {
//                                 index: "default",
//                                 compound: {
//                                     must: [
//                                         {
//                                             text: {
//                                                 query: productName,
//                                                 path: "alias",
//                                                 fuzzy: { maxEdits: 2, prefixLength: 2 },
//                                             },
//                                         },
//                                     ],
//                                 },
//                             },
//                         },
//                         {
//                             $project: {
//                                 _id: 0,
//                                 product_id: 1,
//                                 product_name: 1,
//                                 createdAt: 1,
//                                 match_score: { $meta: "searchScore" },
//                             },
//                         },
//                         { $sort: { match_score: -1 } },
//                         { $limit: 3 },
//                     ]);

//                     console.log("matched Alias : ", matchedAliasAgg);

//                     if (matchedAliasAgg.length > 0) {

//                         // ⭐ 1. Find latest alias
//                         const latestAlias = matchedAliasAgg.reduce((a, b) =>
//                             new Date(a.createdAt) > new Date(b.createdAt)
//                                 ? a
//                                 : b
//                         );

//                         // ⭐ 2. Boost its score
//                         latestAlias.match_score += 10;

//                         // ⭐ 3. Re-sort after boost, pick the final best match
//                         const aliasDoc = matchedAliasAgg.sort(
//                             (a, b) => b.match_score - a.match_score
//                         )[0];

//                         // const aliasDoc = matchedAliasAgg[0];

//                         // Fetch company_id and category_id from products collection
//                         const productDoc = await productModel.findOne(
//                             { _id: aliasDoc.product_id },
//                             {
//                                 company_id: 1,
//                                 category_id: 1,
//                                 unit: 1,
//                                 product_image: 1,
//                                 price: 1,
//                             }
//                         );

//                         matchedProduct = {
//                             id: aliasDoc.product_id,
//                             name: aliasDoc.product_name,
//                             brand: productDoc?.company_id || null,
//                             product_image: productDoc?.product_image || null,
//                             unit: productDoc?.unit,
//                             mrp: productDoc?.price || null,
//                             category: productDoc?.category_id || null,
//                             match_score: aliasDoc.match_score,
//                         };
//                     }
//                 }

//                 console.log("matched Product in core : ", matchedProduct);

//                 enrichedLineItems.push({
//                     ...item,
//                     matched_product: matchedProduct || null,
//                 });
//             }

//             results.push({
//                 source_url: url,
//                 header_data: {
//                     ...headers,
//                     matched_shop: matchedShop
//                         ? {
//                               id: matchedShop._id,
//                               name: matchedShop.shop_name,
//                               phone: matchedShop.phone_no,
//                               city: matchedShop.city,
//                               match_score: matchedShop.score,
//                           }
//                         : null,

//                     item_count: itemCountInfo?.itemCount ?? null,
//                     item_count_confidence: itemCountInfo?.confidence ?? 0,
//                     item_count_source_key: itemCountInfo?.sourceKey ?? null,
//                 },
//                 line_items: enrichedLineItems,
//             });

//             console.log("results : ", results);
//         } catch (err) {
//             results.push({
//                 source_url: url,
//                 error: true,
//                 message: `Textract failed: ${err.message}`,
//             });
//         }
//     }

//     return results;
// }

const extractBillsData = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(200).json({
                error: true,
                title: errors.errors[0].msg,
                errors: errors.array(),
            });
        }

        const { bills } = req.body;
        const results = await extractBillsCore(bills);

        // early fail if any item had a hard error (optional)
        if (results.some((r) => r.error)) {
            return res
                .status(200)
                .json({
                    error: true,
                    message: "Failed to read bills",
                    data: results,
                });
        }

        return res.status(200).json({
            error: false,
            message: "Successfully analyzed bills",
            data: results,
        });
    } catch (error) {
        return res.status(200).json({
            error: true,
            message: error.message || "Something went wrong",
        });
    }
};

async function prefillAndSaveOrder(orderDoc, customerId) {
    const bills = orderDoc.bills || [];
    if (!Array.isArray(bills) || bills.length === 0) return;

    const results = await extractBillsCore(bills);

    console.log("results : ", results);

    // pick first with a shop for assignment
    const firstWithShop = results.find((r) => r?.header_data?.matched_shop);
    const shopName = firstWithShop?.header_data?.matched_shop?.name || null;

    // invoice fields from first available header
    const invoiceNo = results
        .map(
            (r) =>
                r?.header_data?.INVOICE_NO ||
                r?.header_data?.INVOICE_NUMBER ||
                r?.header_data?.INVOICE_RECEIPT_ID
        )
        .find(Boolean);
    const invoiceDateStr = results
        .map((r) => r?.header_data?.INVOICE_RECEIPT_DATE)
        .find(Boolean);
    const invoiceDate = parseDMY(invoiceDateStr);

    const itemCountInfo =
        results
            .map((r) => ({
                itemCount: r?.header_data?.item_count,
                confidence: r?.header_data?.item_count_confidence ?? 0,
            }))
            .sort((a, b) => b.confidence - a.confidence)[0];

    const itemCount =
        itemCountInfo && itemCountInfo.confidence > 0.6
            ? itemCountInfo.itemCount
            : null;

    console.log(
        "ALL TOTAL VALUES:",
        results.map((r) => r?.header_data?.SUBTOTAL)
    );
    console.log(
        "CLEANED VALUES:",
        results.map((r) => cleanAmount(r?.header_data?.SUBTOTAL))
    );

    // total = sum of TOTALs across bills
    // const totalAmount = results.reduce((sum, r) => sum + cleanAmount(r?.header_data?.TOTAL), 0);
    // const totalAmount =
    //     results
    //         .map((r) => cleanAmount(r?.header_data?.SUBTOTAL))
    //         .find((v) => v > 0) || 0;


    let totalAmount = 0;
    let totalSellingPrice = 0;
    let totalConfidence = 0;

    for (const r of results) {
        const net = await inferNetBillAmount(r.header_data);

        if (net?.amount && net.confidence > totalConfidence) {
            totalAmount = net.amount;
            totalSellingPrice = net.amount;
            totalConfidence = net.confidence;
        }
    }


    if (!totalAmount) {
        totalAmount =
            results
                .map(r => cleanAmount(r?.header_data?.TOTAL))
                .find(v => v > 0)
            || results
                .map(r => cleanAmount(r?.header_data?.SUBTOTAL))
                .find(v => v > 0)
            || 0;

        totalSellingPrice =
            results
                .map((r) => cleanAmount(r?.header_data?.SUBTOTAL))
                .find((v) => v > 0) || 0;
    }


    console.log("totalAmount : ", totalAmount);

    // flatten line items
    const flat = results.flatMap((r) => r?.line_items || []);

    // build order_details; add alias to product.aliases if matched
    const order_details = [];
    for (const it of flat) {
        const alias = it.ITEM || null;
        // const qty = Number(it.QUANTITY) || 1;
        const qty = cleanQuantity(it.QUANTITY);
        const unit = it.UNIT || undefined;
        const mp = it.matched_product;

        console.log("matched product : ", mp);

        const selling_price =
            cleanAmount(it.PRICE) ||
            cleanAmount(it.SUBTOTAL) / (Number(it.QUANTITY) || 1) ||
            0;

        const ocr_mrp =
            cleanAmount(it.MRP) || null;

        console.log("it.MRP : ", it.MRP);
        console.log("ocr_mrp : ", ocr_mrp);

        order_details.push({
            company_id: mp?.brand,
            product_id: mp?.id,
            product_name: mp?.name,
            product_image: mp?.product_image,
            unit: mp?.unit,
            mrp: mp?.mrp,
            ocr_mrp: ocr_mrp,
            count: qty,
            quantity: qty,
            rewards: 0,
            alias,
            selling_price,
        });

        if (mp?.id && alias) {
            await productModel.updateOne(
                { _id: mp.id },
                { $addToSet: { aliases: alias } }
            );
        }
    }

    // === Deduplicate final order_details based ONLY on product_id (NO MERGING) ===
    const uniqueOrderDetails = [];
    const seen = new Set();

    for (const od of order_details) {
        const pid = od.product_id;

        if (!pid) {
            // No product match — always keep
            uniqueOrderDetails.push(od);
            continue;
        }

        if (!seen.has(String(pid))) {
            // Keep only the first occurrence
            seen.add(String(pid));
            uniqueOrderDetails.push(od);
        }
        // else => duplicate → do NOT push
    }

    console.log("Before Deduplicate length : ", order_details.length);

    console.log("Post Deduplicate length : ", uniqueOrderDetails.length);

    // ensure shop exists if recognized
    let update = {
        // order_details,
        order_details: uniqueOrderDetails,
        total_amount: totalAmount || 0,
        total_selling_price: totalSellingPrice || 0,
        total_lines: itemCount || 0,
    };
    if (invoiceNo) update.invoice_no = invoiceNo;
    if (invoiceDate) update.invoice_date = invoiceDate;

    if (shopName) {
        let partnerShop = await shopModel.findOne({ shop_name: shopName });
        if (!partnerShop)
            partnerShop = await shopModel.create({
                shop_name: shopName,
                is_dark: true,
            });
        update.shop = partnerShop.shop_name;
        update.shop_id = partnerShop._id;
    }

    // Only prefill if still in 'placed' (avoid overwriting admin edits)
    await orderModel.updateOne(
        { _id: orderDoc._id, order_status: "placed" },
        { $set: update }
    );
}

const deleteCustomerScanImages = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(400).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const { imageUrls } = req.body;
        const s3Keys = [];
        const invalidUrls = [];

        // const s3UrlRegex = /^https?:\/\/[a-zA-Z0-9.-]+\.s3([.-][a-z0-9-]+)?\.amazonaws\.com\/.+$/;
        const s3UrlRegex =
            /^https?:\/\/s3([.-][a-z0-9-]+)?\.amazonaws\.com\/.+|^https?:\/\/[a-zA-Z0-9.-]+\.s3([.-][a-z0-9-]+)?\.amazonaws\.com\/.+$/;

        for (const imageUrl of imageUrls) {
            try {
                if (!s3UrlRegex.test(imageUrl)) {
                    throw new Error("Not a valid S3 URL");
                }

                const decodedUrl = decodeURIComponent(
                    imageUrl.replace(/\+/g, "%20")
                );
                const urlParts = decodedUrl.split("/");
                const keyIndex = urlParts.findIndex((p) => p === "scans");
                if (keyIndex === -1) throw new Error("Invalid S3 URL format");

                const s3Key = urlParts.slice(keyIndex).join("/");
                s3Keys.push({ Key: s3Key });
            } catch (err) {
                invalidUrls.push({ url: imageUrl, reason: err.message });
            }
        }

        if (s3Keys.length === 0) {
            return res.status(400).json({
                error: true,
                message: "No valid AWS S3 image URLs found to delete",
                invalidUrls,
            });
        }

        const notFoundKeys = [];
        for (const { Key } of s3Keys) {
            try {
                await s3
                    .headObject({
                        Bucket: process.env.AWS_BUCKET_NAME,
                        Key,
                    })
                    .promise();
            } catch (err) {
                if (err.code === "NotFound") {
                    notFoundKeys.push(Key);
                } else {
                    console.error("HeadObject error:", err);
                    notFoundKeys.push(Key);
                }
            }
        }

        if (notFoundKeys.length > 0) {
            return res.status(404).json({
                error: true,
                message: "Some objects were not found in S3",
                notFoundKeys,
                invalidUrls,
            });
        }

        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Delete: { Objects: s3Keys },
        };

        const deleteResult = await s3.deleteObjects(deleteParams).promise();
        const deletedCount = deleteResult?.Deleted?.length || 0;
        const errorCount = deleteResult?.Errors?.length || 0;

        if (errorCount > 0) {
            return res.status(500).json({
                error: true,
                message: "Some images could not be deleted",
                failed: deleteResult.Errors,
                invalidUrls,
            });
        }

        return res.status(200).json({
            error: false,
            message: `${deletedCount} image(s) deleted successfully`,
            deleted: deleteResult.Deleted,
            invalidUrls,
        });
    } catch (error) {
        console.error("❌ Delete Customer Scan Images Error:", error);
        return res.status(500).json({
            error: true,
            message:
                error.message || "Something went wrong while deleting images",
        });
    }
};

// const calcOrderRewards = async (req, res) => {
//     try {
//         const {
//             customer_id,
//             shop,
//             order_details = [],
//             amount = 0,
//             invoice_date,
//         } = req.body;

//         const customer = await customerModel.findById(customer_id);

//         // Find partner shop
//         let partnerShop = await shopModel.findOne({ shop_name: shop });
//         if (!partnerShop) {
//             partnerShop = {
//                 _id: null,
//                 shop_name: shop,
//                 rewards: [],
//                 milestone_rewards: [],
//             };
//         }
//         const currentShopId = partnerShop._id;

//         // -------------------------
//         // Build productOffers for product + shop offers
//         // -------------------------
//         const productOffers = {};

//         for (let product of order_details) {
//             if (!product?.product_id) continue;

//             const today = new Date();

//             const offersForProduct = await offerModel.find({
//                 "product_details.product_id": new ObjectId(product.product_id),
//                 offer_start: { $lte: today },
//                 offer_expiry: { $gt: today },
//             });

//             for (let offer of offersForProduct) {
//                 // Skip shop offers not matching selected shop
//                 if (
//                     offer.offer_type === "shop" &&
//                     Array.isArray(offer.shop_id) &&
//                     offer.shop_id.length > 0 &&
//                     !offer.shop_id.some((id) => String(id) === String(currentShopId))
//                 ) {
//                     continue;
//                 }

//                 // Redeem limit check
//                 const redeemedCount = await redeemModel.countDocuments({
//                     offer_id: offer._id,
//                     customer_id,
//                 });
//                 if ((offer.redeem_limit || 0) <= redeemedCount) continue;

//                 if (!productOffers[offer._id]) {
//                     productOffers[offer._id] = {
//                         offerDetails: offer,
//                         products: [],
//                     };
//                 }

//                 if (!productOffers[offer._id].products.some(p => String(p.product_id) === String(product.product_id))) {
//                     productOffers[offer._id].products.push(product);
//                 }
//             }
//         }

//         // -------------------------
//         // Calculate total reward per offer and product
//         // -------------------------
//         let totalReward = 0;
//         const offerIds = [];

//         for (const [offerId, data] of Object.entries(productOffers)) {
//             let highestReward = 0;

//             for (let product of data.products) {
//                 const offerProduct = data.offerDetails.product_details.find(
//                     (p) => String(p.product_id) === String(product.product_id)
//                 );
//                 const rewardValue = offerProduct?.reward || 0;

//                 // Sum for product display
//                 product.reward = (product.reward || 0) + rewardValue;
//                 product.rewards = product.reward;

//                 // Track highest reward for this offer
//                 if (rewardValue > highestReward) {
//                     highestReward = rewardValue;
//                 }
//             }

//             totalReward += highestReward; // sum of highest rewards per offer
//             offerIds.push(offerId);
//         }

//         // -------------------------
//         // Add system scan reward
//         // -------------------------
//         const systemScanRewards = await systemConfigModel.findOne({ type: "scan_rewards" });
//         const scanRewardAmount = systemScanRewards?.reward || 0;
//         totalReward += scanRewardAmount;

//         // -------------------------
//         // Shop slab reward
//         // -------------------------
//         const shopRewardArr = partnerShop.rewards || [];
//         const matchedTier = shopRewardArr.find((tier, i) => {
//             const next = shopRewardArr[i + 1];
//             if (next) return amount >= tier.amount && amount < next.amount;
//             return amount >= tier.amount;
//         });
//         const shopRewardAmount = matchedTier?.reward || 0;
//         totalReward += shopRewardAmount;

//         // -------------------------
//         // Milestone reward
//         // -------------------------
//         const invoiceMonth = invoice_date
//             ? dayjs(invoice_date).format("MMMM").toLowerCase()
//             : dayjs().format("MMMM").toLowerCase();
//         const invoiceYear = invoice_date
//             ? dayjs(invoice_date).format("YYYY")
//             : dayjs().format("YYYY");

//         const spentOnShop = customer?.spent_amount.filter(
//             (val) =>
//                 String(val.shop_id) === String(currentShopId) &&
//                 val.month === invoiceMonth &&
//                 val.year === invoiceYear
//         );
//         const milestones = [...(partnerShop.milestone_rewards || [])].sort((a, b) => a.amount - b.amount);
//         const previousSpent = spentOnShop?.[0]?.amount || 0;
//         const newTotalSpent = previousSpent + amount;

//         const newlyAchievedMilestones = milestones.filter(
//             (m) => m.amount > previousSpent && m.amount <= newTotalSpent
//         );
//         const prevReward = milestones.filter((m) => m.amount <= previousSpent).pop()?.reward || 0;
//         const milestoneRewardToGive = newlyAchievedMilestones.length
//             ? newlyAchievedMilestones.slice(-1)[0].reward - prevReward
//             : 0;
//         totalReward += milestoneRewardToGive;

//         // -------------------------
//         // Build offers array for frontend (highest reward per offer)
//         // -------------------------
//         const offersArr = [];
//         for (const [offerId, data] of Object.entries(productOffers)) {
//             const offer = data.offerDetails;
//             const companyInfo = await companyModel.findById(offer.company_id).lean();

//             // Find product with highest reward for this offer
//             const highestProduct = data.products.reduce((prev, curr) => {
//                 const prevReward = data.offerDetails.product_details.find(p => String(p.product_id) === String(prev.product_id))?.reward || 0;
//                 const currReward = data.offerDetails.product_details.find(p => String(p.product_id) === String(curr.product_id))?.reward || 0;
//                 return currReward > prevReward ? curr : prev;
//             });

//             offersArr.push({
//                 offer_id: offer._id,
//                 offer_title: offer.offer_title,
//                 offer_type: offer.offer_type,
//                 company_id: offer.company_id,
//                 brand_name: companyInfo?.company_name || "N/A",
//                 product_id: highestProduct.product_id,
//                 product_name: highestProduct.product_name || "N/A",
//                 reward: data.offerDetails.product_details.find(p => String(p.product_id) === String(highestProduct.product_id))?.reward || 0,
//             });
//         }

//         // -------------------------
//         // Return final breakdown
//         // -------------------------
//         const breakdown = {
//             total_reward: totalReward,
//             shop_reward: shopRewardAmount,
//             milestone_reward: milestoneRewardToGive,
//             scan_reward: scanRewardAmount,
//             offers: offersArr,
//         };

//         return res.status(200).json({
//             error: false,
//             data: {
//                 breakdown,
//                 order_details,
//                 offerIds,
//                 partnerShopId: currentShopId,
//             },
//         });

//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({
//             error: true,
//             message: error.message || "Failed to calculate order rewards",
//         });
//     }
// };



const calcOrderRewards = async (req, res) => {
    try {
        const {
            id,
            customer_id,
            shop,
            order_status,
            order_details = [],
            reason,
            amount = 0,
            invoice_no,
            invoice_date,
            total_selling_price,
        } = req.body;

        // Load customer (read-only)
        const customer = await customerModel.findById(customer_id);

        // Find partner shop (include partner stores + the special eligible dark store)
        let partnerShop = await shopModel.findOne({
            shop_name: shop,
            $or: [{ is_dark: false }, { is_dark: { $exists: false } }, { _id: new ObjectId(ELIGIBLE_DARK_STORE_ID) }],
        });
        if (!partnerShop) {
            // simulate minimal partnerShop so reward logic can still run
            partnerShop = {
                _id: null,
                is_dark: true,
                shop_name: shop,
                rewards: [], // shop reward tiers
                milestone_rewards: [],
            };
        }

        const isEligibleForShopRewards = !partnerShop.is_dark || String(partnerShop._id) === ELIGIBLE_DARK_STORE_ID;

        // -------------------------
        // Build productOffers same as saveScanOrder
        // -------------------------
        let productOffers = {};
        for (let product of order_details) {
            if (!product || !product.product_id) continue;

            const today = new Date();
            const offers = await offerModel.find({
                "product_details.product_id": new ObjectId(product.product_id),
                is_hidden: false,
                offer_start: { $lte: today },
                offer_expiry: { $gt: today },
            });

            for (let offer of offers) {

                // Shop-wise offer validation
                if (offer.offer_type === "shop") {
                    if (!isEligibleForShopRewards) continue;
                    if (
                        Array.isArray(offer.shop_id) &&
                        offer.shop_id.length > 0 &&
                        !offer.shop_id.some(id => String(id) === String(partnerShop._id))
                    ) {
                        continue;
                    }
                }

                if (productOffers[offer._id]) {
                    productOffers[offer._id].products.push({
                        ...product,
                        reward: 0,
                        rewards: 0,
                    });
                } else {
                    productOffers[offer._id] = {
                        offerDetails: offer,
                        products: [{
                            ...product,
                            reward: 0,
                            rewards: 0,
                        }],
                    };
                }
            }
        }

        // -------------------------
        // Offer-level reward computation (same as saveScanOrder)
        // -------------------------
        let totalReward = 0;
        let offerIds = [];

        for (let [offerId, companyData] of Object.entries(productOffers)) {

            const redeem = await redeemModel.countDocuments({
                offer_id: new ObjectId(offerId),
                customer_id,
            });

            if ((companyData.offerDetails.redeem_limit || 0) <= redeem) {
                continue;
            }

            const today = new Date();
            const startDate = companyData.offerDetails.offer_start;
            const expiryDate = dayjs(companyData.offerDetails.offer_expiry);

            if (
                !dayjs(today).isSameOrAfter(startDate) ||
                !dayjs(today).isBefore(expiryDate)
            ) {
                continue;
            }

            // Winner-takes-all per offer: only the highest-reward matched product
            // in this offer wins; all other matched products in the same offer
            // get 0. Mirrors saveScanOrder so preview matches what is stored.
            let highestRewardForOffer = 0;
            let winner = null;
            for (const pro of companyData.products) {
                const offerProduct =
                    companyData.offerDetails.product_details.find(
                        (p) =>
                            String(p.product_id) === String(pro.product_id)
                    );
                const rewardValue = offerProduct?.reward || 0;
                if (rewardValue > highestRewardForOffer) {
                    highestRewardForOffer = rewardValue;
                    winner = pro;
                }
            }

            companyData.products.forEach((p) => {
                p.reward = 0;
                p.rewards = 0;
            });
            if (winner && highestRewardForOffer > 0) {
                winner.reward = highestRewardForOffer;
                winner.rewards = highestRewardForOffer;
                if (!offerIds.includes(offerId)) {
                    offerIds.push(offerId);
                }
            }

            totalReward += highestRewardForOffer;
        }

        // -------------------------
        // Add system scan reward
        // -------------------------
        const systemScanRewards = await systemConfigModel.findOne({
            type: "scan_rewards",
        });
        const scanRewardAmount = systemScanRewards?.reward || 0;
        totalReward += scanRewardAmount;

        // -------------------------
        // Shop reward (tier) — only for eligible shops
        // -------------------------
        let shopRewardAmount = 0;
        if (isEligibleForShopRewards) {
            let shopRewardArr = partnerShop.rewards || [];
            let shopReward = shopRewardArr.filter((val, i) => {
                if (partnerShop.rewards && partnerShop.rewards[i + 1]) {
                    if (
                        amount >= val.amount &&
                        amount < partnerShop.rewards[i + 1].amount
                    ) {
                        return true;
                    }
                } else if (amount >= val.amount) {
                    return true;
                }
                return false;
            });

            shopRewardAmount =
                shopReward[0] && shopReward[0].reward ? shopReward[0].reward : 0;
            totalReward += shopRewardAmount;
        }

        // -------------------------
        // Milestone logic (month/year based) — only for eligible shops
        // -------------------------
        let milestoneRewardToGive = 0;
        let milestoneAchieved = [];
        let previousSpent = 0;
        let newTotalSpent = amount;

        if (isEligibleForShopRewards) {
            const invoiceMonth = invoice_date
                ? dayjs(invoice_date).format("MMMM").toLowerCase()
                : dayjs().format("MMMM").toLowerCase();
            const invoiceYear = invoice_date
                ? dayjs(invoice_date).format("YYYY")
                : dayjs().format("YYYY");

            const spentOnShop = customer?.spent_amount.filter(
                (val) =>
                    String(val.shop_id) === String(partnerShop._id) &&
                    val.month === invoiceMonth &&
                    val.year === invoiceYear
            );

            const milestones = [...(partnerShop.milestone_rewards || [])].sort(
                (a, b) => a.amount - b.amount
            );

            previousSpent = spentOnShop?.[0]?.amount || 0;
            newTotalSpent = previousSpent + amount;

            // Only milestones unlocked BY THIS ORDER
            const newlyAchievedMilestones = milestones.filter(
                (m) => m.amount > previousSpent && m.amount <= newTotalSpent
            );

            if (newlyAchievedMilestones.length > 0) {
                const prevReward =
                    milestones.filter((m) => m.amount <= previousSpent).pop()
                        ?.reward || 0;

                const newTopReward = newlyAchievedMilestones.slice(-1)[0].reward;

                milestoneRewardToGive = newTopReward - prevReward;

                totalReward += milestoneRewardToGive;
            }

            milestoneAchieved = newlyAchievedMilestones.map((m) => ({
                id: m._id,
                amount: m.amount,
                reward: m.reward,
            }));
        }

        // -------------------------
        // Build offersArr
        // -------------------------
        const offersArr = [];
        for (const [offerId, companyData] of Object.entries(productOffers)) {
            const offer = companyData.offerDetails;

            const rewardedProduct = companyData.products.find(
                (p) =>
                    (p.rewards && p.rewards > 0) || (p.reward && p.reward > 0)
            );
            if (rewardedProduct) {
                const companyInfo = await companyModel
                    .findById(offer.company_id)
                    .lean();
                const productInfo = await productModel
                    .findById(rewardedProduct.product_id)
                    .lean();

                offersArr.push({
                    offer_id: offer._id,
                    offer_title: offer.offer_title || "N/A",
                    offer_type: offer.offer_type,
                    company_id: offer.company_id,
                    brand_name: companyInfo?.company_name || "N/A",

                    product_id: rewardedProduct.product_id,
                    product_name:
                        productInfo?.product_name ||
                        productInfo?.alias ||
                        "N/A",

                    reward:
                        rewardedProduct.rewards || rewardedProduct.reward || 0,
                });
            } else {
            }
        }

        // -------------------------
        // shop hits (for breakdown)
        // -------------------------
        let shopHitsArr = [];
        if (isEligibleForShopRewards && partnerShop?.rewards?.length > 0) {
            const matchedTier = partnerShop.rewards.find((tier, i) => {
                if (partnerShop.rewards[i + 1]) {
                    return (
                        amount >= tier.amount &&
                        amount < partnerShop.rewards[i + 1].amount
                    );
                } else {
                    return amount >= tier.amount;
                }
            });
            if (matchedTier) {
                shopHitsArr.push({
                    amount: matchedTier.amount,
                    reward: matchedTier.reward,
                });
            }
        }

        // -------------------------
        // milestone hits array sorted ascending by amount
        // -------------------------

        const milestoneRewardsArr = milestoneAchieved
            .map((r) => ({
                milestone_id: r.id,
                amount: r.amount,
                reward: r.reward,
            }))
            .sort((a, b) => a.amount - b.amount);

        // ----------------------------------------
        // Referral Rewards
        // ----------------------------------------

        async function _calcReferralRewards(customer_id) {
            const customer = await customerModel.findById(customer_id);

            if (!customer)
                return {
                    isFirstOrder: false,
                    referrerReward: 0,
                    referredReward: 0,
                    referrer_id: null,
                };

            // Count completed orders
            const numberOfOrders = await orderModel.countDocuments({
                customer_id,
                order_status: "completed",
            });

            // If not first order → no referral reward
            if (numberOfOrders > 0) {
                return {
                    isFirstOrder: false,
                    referrerReward: 0,
                    referredReward: 0,
                    referrer_id: customer.referred_by || null,
                };
            }

            // First order AND has a referrer?
            if (!customer.referred_by) {
                return {
                    isFirstOrder: true,
                    referrerReward: 0,
                    referredReward: 0,
                    referrer_id: null,
                };
            }

            // Get system configs
            const referrer_rewards = await systemConfigModel.findOne({
                type: "referrer_rewards",
            });

            const referred_rewards = await systemConfigModel.findOne({
                type: "referred_rewards",
            });

            return {
                isFirstOrder: true,
                referrerReward: referrer_rewards?.reward || 0,
                referredReward: referred_rewards?.reward || 0,
                referrer_id: customer.referred_by,
            };
        }

        const referralData = await _calcReferralRewards(customer_id);

        totalReward += (referralData.referredReward || 0);

        const referralRewardsBreakdown = {
            is_first_order: referralData.isFirstOrder,
            referrer_reward: referralData.referrerReward,
            referred_reward: referralData.referredReward,
            referrer_id: referralData.referrer_id,
        };


        // -------------------------
        // Build the final breakdown object similar to OrderRewardBreakdown.create
        // -------------------------
        const breakdown = {
            order_rewards: {
                shop_reward: shopRewardAmount,
                milestone_reward: milestoneRewardToGive,
                scan_reward: scanRewardAmount,
            },
            referral_rewards: referralRewardsBreakdown,
            offers: offersArr,
            milestone_hits: milestoneRewardsArr,
            shop_hits: shopHitsArr,
            amount_spent: amount,
            previous_spent: previousSpent,
            new_total_spent: newTotalSpent,
            total_reward: totalReward,
            offerIds: offerIds,
            partnerShopId: partnerShop._id || null,
        };

        const returnedOrderDetails = order_details.map((od) => {

            const matches = Object.values(productOffers)
                .flatMap((p) => p.products)
                .filter((p) => String(p.product_id) === String(od.product_id));

            const totalProductReward = matches.reduce(
                (sum, p) => sum + (p.rewards || p.reward || 0),
                0
            );

            return {
                ...od,
                reward: totalProductReward,
                rewards: totalProductReward,
            };
        });

        // const returnedOrderDetails = order_details.map((od) => {
        //     const match = Object.values(productOffers)
        //         .flatMap((p) => p.products)
        //         .find((p) => String(p.product_id) === String(od.product_id));
        //     if (match) {
        //         return {
        //             ...od,
        //             reward: match.reward || match.rewards || 0,
        //             rewards: match.rewards || match.reward || 0,
        //         };
        //     } else {
        //         return {
        //             ...od,
        //             reward: od.reward || od.rewards || 0,
        //             rewards: od.rewards || od.reward || 0,
        //         };
        //     }
        // });

        return res.status(200).json({
            error: false,
            data: {
                breakdown,
                order_details: returnedOrderDetails,
            },
        });
    } catch (error) {
        console.error("calcOrderRewards error", error);
        return res.status(500).json({
            error: true,
            message: error.message || "Failed to calculate order rewards",
        });
    }
};

const reprocessScanOrder = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const { order_id } = req.body;

        const order = await orderModel.findById(order_id);
        if (!order) {
            return res.status(200).json({
                error: true,
                message: "Order not found",
            });
        }

        await orderModel.findByIdAndUpdate(order_id, {
            $set: {
                textract_status: "processing",
                order_details: [],
            },
        });

        const updatedOrder = await orderModel.findById(order_id);

        axios.post(
            process.env.PREFILL_LAMBDA_URL,
            {
                order: updatedOrder,
                customer_id: updatedOrder.customer_id,
                env: {
                    MONGO_URI: DB,
                    AWS_REGION: REGION,
                    AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY,
                    AWS_SECRET_KEY: process.env.AWS_SECRET_KEY,
                    BUCKET: process.env.AWS_BUCKET_NAME,
                    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
                    TEXTRACT_AWS_ACCESS_KEY: process.env.TEXTRACT_AWS_ACCESS_KEY,
                    TEXTRACT_AWS_SECRET_KEY: process.env.TEXTRACT_AWS_SECRET_KEY,
                },
            }
        ).catch(async (e) => {
            console.log("Lambda reprocess invocation error:", e?.message);
            await orderModel.findByIdAndUpdate(order_id, {
                $set: { textract_status: "failed" },
            });
        });

        return res.status(200).json({
            error: false,
            message: "Reprocessing started",
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

module.exports = {
    scanOrderListing,
    scanOrderListingForShop,
    addScanOrder,
    scanOrderDetails,
    scanOrderDetailsForShop,
    saveScanOrder,
    deleteScanOrder,
    deleteScanImage,
    extractBillsData,
    deleteCustomerScanImages,
    calcOrderRewards,
    reprocessScanOrder,
};
