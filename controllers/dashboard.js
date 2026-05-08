// const { validationResult } = require('express-validator');
// const redeemReq = require('../models/redeemReq');
// const orderModel = require('../models/order');
// const dayjs = require('dayjs');
// const settlement = require('../models/settlement');


// const getDatablockDetails = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }

//     const total_redeems = await redeemReq.find({ status: "fulfilled" }).count();
//     const total_settled_earnings = await settlement.find({ status: "settled" }).count();
//     const total_unsettled_earnings = await settlement.find({ status: "pending" }).count();

//     const completedOrders = await orderModel.find({ order_status: "completed" });

//     let total_bill_amount = 0;
//     completedOrders.forEach(order => {
//       total_bill_amount += order.total_amount;
//     });

//     let total_bill_scans = 0;
//     completedOrders.forEach((order) => {
//       if (order.bills && Array.isArray(order.bills)) {
//         total_bill_scans += order.bills.length;
//       }
//     });

//     const completedRedeems = await redeemReq.find({ status: "fulfilled" });

//     let total_coins = 0;


//     completedRedeems.forEach(redeem => {
//       total_coins += redeem.coins;
//     });

//     const total_redeem_amount = total_coins / 100;

//     res
//       .status(200)
//       .json({
//         error: false,
//         message: "Sucessfully fetched data",
//         data: {
//           total_redeems,
//           total_settled_earnings,
//           total_unsettled_earnings,
//           total_bill_amount,
//           total_bill_scans,
//           total_redeem_amount
//         }
//       });

//   } catch (error) {
//     return res.status(200).json({
//       title: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };


// const getDashboardDetails = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }

//     const redeemOrderData = await redeemReq.find({ shop_id: { $ne: null } }).sort({ createdAt: "desc" }).populate("customer_id", ["name"]).limit(10);

//     const scanOrderData = await orderModel.find({ is_offline: true, order_status: "completed" }).sort({ createdAt: "desc" }).populate("customer_id", ["name"]).limit(10);

//     res
//       .status(200)
//       .json({
//         error: false,
//         message: "Sucessfully fetched data",
//         redeemOrderData,
//         scanOrderData,
//       });

//   } catch (error) {
//     return res.status(200).json({
//       title: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };

// const scanAnalyticsLastSixMonths = async (req, res) => {
//   try {
//     const today = dayjs();

//     // Generate start and end dates
//     const start = today.subtract(3, 'month').startOf('month').toDate();
//     const end = today.subtract(1, 'month').endOf('month').toDate();

//     // Create array of last 3 months (excluding current month)
//     const months = [];
//     for (let i = 3; i >= 1; i--) {
//       const month = today.subtract(i, 'month').format('YYYY-MM');
//       months.push(month);
//     }

//     // Run aggregation query
//     const result = await orderModel.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: start, $lte: end }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             $dateToString: { format: "%Y-%m", date: "$createdAt" }
//           },
//           totalScanAmount: { $sum: "$total_amount" },
//           scanCount: { $sum: 1 }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     // Map result to a dictionary for easier lookup
//     const dataMap = {};
//     result.forEach(item => {
//       dataMap[item._id] = item;
//     });

//     // Ensure all months are included, filling missing ones with zeros
//     const scanData = months.map(month => {
//       if (dataMap[month]) {
//         return {
//           month,
//           totalScanAmount: dataMap[month].totalScanAmount,
//           scanCount: dataMap[month].scanCount
//         };
//       } else {
//         return {
//           month,
//           totalScanAmount: 0,
//           scanCount: 0
//         };
//       }
//     });

//     return res.status(200).json({
//       error: false,
//       title: "Successfully fetched scan analytics for last 3 months",
//       scanData
//     });
//   } catch (error) {
//     return res.status(500).json({
//       title: error.message || "Something went wrong",
//       error: true
//     });
//   }
// };




// module.exports = {
//   getDashboardDetails,
//   scanAnalyticsLastSixMonths,
//   getDatablockDetails,
// };


const { validationResult } = require('express-validator');
const redeemReq = require('../models/redeemReq');
const orderModel = require('../models/order');
const dayjs = require('dayjs');
const settlement = require('../models/settlement');
const customerModel = require('../models/customer');
 
 
const getDatablockDetails = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }
    const {_id , shop_name} = req.shop
    const total_redeems = await redeemReq.find({ shop_id:_id, status: "fulfilled" }).count();
    const total_settled_earnings = await settlement.find({ shop_id:_id,status: "settled" }).count();
    const total_unsettled_earnings = await settlement.find({ shop_id:_id, status: "pending" }).count();
 
    const completedOrders = await orderModel.find({ shop: shop_name , order_status: "completed" });
 
    let total_bill_amount = 0;
    completedOrders.forEach(order => {
      total_bill_amount += order.total_amount;
    });
 
    let total_bill_scans = 0;
    completedOrders.forEach((order) => {
      if (order.bills && Array.isArray(order.bills)) {
        total_bill_scans += order.bills.length;
      }
    });
 
    const completedRedeems = await redeemReq.find({ status: "fulfilled", shop_id:  _id});
 
    let total_coins = 0;
 
 
    completedRedeems.forEach(redeem => {
      total_coins += redeem.coins;
    });
 
    const total_redeem_amount = total_coins / 100;
 
    res
      .status(200)
      .json({
        error: false,
        message: "Sucessfully fetched data",
        data: {
          total_redeems,
          total_settled_earnings,
          total_unsettled_earnings,
          total_bill_amount,
          total_bill_scans,
          total_redeem_amount
        }
      });
 
  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};

// const getMonthlyReports = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }

//     const { _id, shop_name } = req.shop;

//     const startOfMonth = dayjs().startOf("month").toDate();
//     const endOfToday = dayjs().endOf("day").toDate();

//     console.log("startofthemonth : " , startOfMonth);
//     console.log("endoftoday : " , endOfToday);

//     const scanData = await orderModel.aggregate([
//       {
//         $match: {
//           shop: shop_name,
//           order_status: "completed",
//           is_offline: true,
//           createdAt: { $gte: startOfMonth, $lte: endOfToday },
//         },
//       },
//       {
//         $lookup: {
//           from: "customers",
//           localField: "customer_id",
//           foreignField: "_id",
//           as: "customer",
//         },
//       },
//       {
//         $unwind: {
//           path: "$customer",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           name: {
//             $cond: {
//               if: { $ifNull: ["$customer.name", false] },
//               then: {
//                 $concat: [
//                   { $substr: ["$customer.name", 0, 2] },
//                   "***",
//                 ],
//               },
//               else: "NA",
//             },
//           },
//           total_amount: 1,
//           total_rewards: 1,
//           createdAt: 1,
//         },
//       },
//       {
//         $sort: { createdAt: -1 },
//       },
//     ]);

//     return res.status(200).json({
//       error: false,
//       message: "Successfully fetched current month's scans",
//       data: scanData,
//     });

//   } catch (error) {
//     return res.status(200).json({
//       title: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };

const getMonthlyReports = async (req, res) => {
  try {

    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { _id , shop_name } = req.shop;

    const startOfMonth = dayjs().startOf("month").toDate();
    const endOfToday = dayjs().endOf("day").toDate();

    // Scan Data
    const scans = await orderModel.aggregate([
      {
        $match: {
          shop: shop_name,
          order_status: "completed",
          is_offline: true,
          createdAt: { $gte: startOfMonth, $lte: endOfToday },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $unwind: {
          path: "$customer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          name: {
            $cond: {
              if: { $ifNull: ["$customer.name", false] },
              then: {
                $concat: [
                  { $substr: ["$customer.name", 0, 2] },
                  "***",
                ],
              },
              else: "NA",
            },
          },
          total_amount: 1,
          total_reward: 1,
          createdAt: 1,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    const totalScanReward = scans.reduce((sum, item) => sum + (item.total_reward || 0), 0);

    // Milestone Data
    const milestoneCustomers = await customerModel.aggregate([
      {
        $match: {
          "spent_amount.shop_id": _id,
          "spent_amount.month": dayjs().format("MMMM").toLowerCase(),
          "spent_amount.year": dayjs().format("YYYY"),
        },
      },
      {
        $unwind: "$spent_amount",
      },
      {
        $match: {
          "spent_amount.shop_id": _id,
          "spent_amount.month": dayjs().format("MMMM").toLowerCase(),
          "spent_amount.year": dayjs().format("YYYY"),
        },
      },
      {
        $project: {
          _id: 0,
          name: {
            $concat: [
              { $substr: ["$name", 0, 1] },
              "***",
            ],
          },
          total_amount: "$spent_amount.amount",
          reward: "$rewards",
          createdAt: "$createdAt",
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const totalMilestoneReward = milestoneCustomers.reduce((sum, c) => sum + (c.reward || 0), 0);

    res.status(200).json({
      error: false,
      message: "Successfully fetched current month's reports",
      monthlyScanData: {
        total_scan_reward: totalScanReward,
        data: scans,
      },
      monthlyMilestoneData: {
        total_milestone_reward: totalMilestoneReward,
        data: milestoneCustomers,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: true,
      message: error.message || "Something went wrong",
    });
  }
};


 
 
 
// const getDashboardDetails = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }
//     const {_id , shop_name} = req.shop
//     const redeemOrderData = await redeemReq.find({ shop_id: _id }).sort({ createdAt: "desc" }).populate("customer_id", ["name"]).limit(10);
 
//     const scanOrderData = await orderModel.find({  shop: shop_name ,is_offline: true, order_status: "completed"}).sort({ createdAt: "desc" }).populate("customer_id", ["name"]).limit(10);
 
//     res
//       .status(200)
//       .json({
//         error: false,
//         message: "Sucessfully fetched data",
//         redeemOrderData,
//         scanOrderData,
//       });
 
//   } catch (error) {
//     return res.status(200).json({
//       title: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };

const getDashboardDetails = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    const { _id, shop_name } = req.shop;

    const redeemOrderData = await redeemReq
      .find({ shop_id: _id })
      .sort({ createdAt: "desc" })
      .populate("customer_id", ["first_name", "last_name"])
      .limit(10);

    const scanOrderData = await orderModel
      .find({
        shop: shop_name,
        is_offline: true,
        order_status: "completed",
      })
      .sort({ createdAt: "desc" })
      .populate("customer_id", ["first_name", "last_name"])
      .limit(10);

    return res.status(200).json({
      error: false,
      message: "Successfully fetched data",
      redeemOrderData,
      scanOrderData,
    });
  } catch (error) {
    return res.status(200).json({
      error: true,
      message: error.message || "Something went wrong",
    });
  }
};

 
// const getDashboardDetails = async (req, res) => {
//   try {
//     const result = validationResult(req);
//     if (result.errors.length > 0) {
//       return res.status(200).json({
//         error: true,
//         title: result.errors[0].msg,
//         errors: result,
//       });
//     }

//     const { _id, shop_name } = req.shop;

//     const redeemOrderDataRaw = await redeemReq
//       .find({ shop_id: _id })
//       .sort({ createdAt: "desc" })
//       .populate("customer_id", ["name"])
//       .limit(10);

//     const scanOrderDataRaw = await orderModel
//       .find({ shop: shop_name, is_offline: true, order_status: "completed" })
//       .sort({ createdAt: "desc" })
//       .populate("customer_id", ["name"])
//       .limit(10);

//     // Utility function to mask names
//     const maskName = (name) => {
//       if (!name || typeof name !== "string") return "";
//       return name.length > 1
//         ? name[0] + "*".repeat(name.length - 1)
//         : name; // If it's a 1-letter name, return as-is
//     };

//     // Mask names in both datasets
//     const redeemOrderData = redeemOrderDataRaw.map((entry) => {
//       const maskedName = maskName(entry.customer_id?.name);
//       return {
//         ...entry.toObject(),
//         customer_id: {
//           ...entry.customer_id.toObject(),
//           name: maskedName,
//         },
//       };
//     });

//     const scanOrderData = scanOrderDataRaw.map((entry) => {
//       const maskedName = maskName(entry.customer_id?.name);
//       return {
//         ...entry.toObject(),
//         customer_id: {
//           ...entry.customer_id.toObject(),
//           name: maskedName,
//         },
//       };
//     });

//     res.status(200).json({
//       error: false,
//       message: "Successfully fetched data",
//       redeemOrderData,
//       scanOrderData,
//     });
//   } catch (error) {
//     return res.status(200).json({
//       message: error.message || "Something went wrong",
//       error: true,
//     });
//   }
// };

const scanAnalyticsLastSixMonths = async (req, res) => {
  try {
    const {_id , shop_name} = req.shop;
    const today = dayjs();
 
    // Generate start and end dates
    const start = today.subtract(6, 'month').startOf('month').toDate();
    const end = today.subtract(1, 'month').endOf('month').toDate();
 
    // Create array of last 3 months (excluding current month)
    const months = [];
    for (let i = 6; i >= 1; i--) {
      const month = today.subtract(i, 'month').format('YYYY-MM');
      months.push(month);
    }
 
    // Run aggregation query
    const result = await orderModel.aggregate([
      {
        $match: {
          shop:shop_name,
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" }
          },
          totalScanAmount: { $sum: "$total_amount" },
          totalCoinsEarned: { $sum : "$total_reward"}
        }
      },
      { $sort: { _id: 1 } }
    ]);
 
    // Map result to a dictionary for easier lookup
    const dataMap = {};
    result.forEach(item => {
      dataMap[item._id] = item;
    });
 
    // Ensure all months are included, filling missing ones with zeros
    const scanData = months.map(month => {
      if (dataMap[month]) {
        return {
          month,
          totalScanAmount: dataMap[month].totalScanAmount,
          totalCoinsEarned: dataMap[month].totalCoinsEarned
        };
      } else {
        return {
          month,
          totalScanAmount: 0,
          totalCoinsEarned: 0,
        };
      }
    });
 
     // Run aggregation query
    const resultCoins = await redeemReq.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          shop_id:_id,
          status:"fulfilled"
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" }
          },
          totalCoinsRedeemed: { $sum: "$coins" },
        }
      },
      { $sort: { _id: 1 } }
    ]);
 
    // Map result to a dictionary for easier lookup
    const resultCoinsdataMap = {};
    resultCoins.forEach(item => {
      resultCoinsdataMap[item._id] = item;
    });
 
    // Ensure all months are included, filling missing ones with zeros
    const redeemData = months.map(month => {
      if (resultCoinsdataMap[month]) {
        return {
          month,
          totalCoinsRedeemed: resultCoinsdataMap[month].totalCoinsRedeemed,
        };
      } else {
        return {
          month,
          totalCoinsRedeemed: 0,
        };
      }
    });
 
    return res.status(200).json({
      error: false,
      message: "Successfully fetched scan analytics for last 6 months",
      scanData,
      redeemData
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Something went wrong",
      error: true
    });
  }
};
 
 
 
 
module.exports = {
  getDashboardDetails,
  scanAnalyticsLastSixMonths,
  getDatablockDetails,
  getMonthlyReports,
};
