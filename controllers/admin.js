const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const adminModel = require('../models/admin')
const {sendMailOtp, sendPushNotification, hashPassword} = require('../lib/helper');
const { maintainance } = require("../models/maintainance");
const order = require("../models/order");
const query = require("../models/query");
const redeemReq = require("../models/redeemReq");
const customer = require("../models/customer");
const bcrypt = require('bcryptjs')

const login = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const {email, password} = req.body
        const admin = await adminModel.findOne({email:email})
        if(!admin){
            return res.status(200).json({message: 'Enter valid email', error: true})
        } else{
            const isMatch = await bcrypt.compare(password, admin.password)
            if(isMatch){
                const token = await jwt.sign({
                    _id: admin._id,
                    firstname: admin.firstname,
                    lastname: admin.lastname
                }, process.env.jwt_secret);
                return res.status(200).json({message: 'Successfully logged in', error: false , token})
            } else{
                return res.status(200).json({message: 'Invalid password', error: true})
            }
        }
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const adminDetails = async (req,res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.admin

        const admin = await adminModel.findById(_id).select(["firstname","lastname"])

        return res.status(200).json({message: "successfully fetched data", error: false , admin})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const aboutAdmin = async (req,res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { firstname, lastname , password, id} = req.body
        if(password){
            await adminModel.findByIdAndUpdate(id,{firstname:firstname, lastname:lastname, password:password})
        } else {
            await adminModel.findByIdAndUpdate(id,{firstname:firstname, lastname:lastname})
        }
        
        return res.status(200).json({
            message: "Admin information saved successfully",
            error: false,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}


const sendOtp = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { email } = req.body;
        const admin = await adminModel.findOne({email:email})
        if(!admin) {
            return res.status(200).json({
                message: "Admin not found",
                error: true,
            });
        }
        const otp = await sendMailOtp(email);
        await adminModel.updateOne({ email }, { otp }, { upsert: true });

        return res.status(200).json({
            message: "OTP sent successful",
            error: false,
            email,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

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
        const { email } = req.body;
        const otp = await sendMailOtp(email);
        await adminModel.updateOne({ email }, { otp });

        return res.status(200).json({
            message: "OTP sent successful",
            error: false,
            email,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

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
        const { email, otp } = req.body
        const foundAdmin = await adminModel.findOne({ email }).exec();
        
        //String(foundCustomer.otp)
        if (String(foundAdmin.otp) === String(otp)) {
            const admin = await adminModel.findByIdAndUpdate(foundAdmin._id, { otp: '' }).exec();
            const token = await jwt.sign({
                _id: admin._id,
                firstname: admin.firstname,
                lastname: admin.lastname
            }, process.env.jwt_secret);
                
                return res.status(200).json({
                    message: "OTP verified successfully",
                    error: false,
                    token,
                    admin
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
}

const EnableDisableMaintainance = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { on_maintainance } = req.body
        await maintainance.findOneAndUpdate({},{on_maintainance},{upsert:true})
        // if(on_maintainance == true){
        //     const customerData = await customer.find({})
        //     for(let user of customerData){
        //         if (user && user.device_token && user.device_token.length > 0) {
        //             const title = "Maintainance Mode";
        //             const body = ""
        //             const not_body = "ShopKya app is on maintenance mode. Hang tight, we will be back soon.";
        //             for (const token of user.device_token) {
        //               await sendPushNotification(token, title, body, not_body);
        //             }
        //         }
        //     }
        // }
        return res.status(200).json({error: false, message: "Successfully updated maintainance mode"})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const maintainanceModeDetails = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const maintainanceData = await maintainance.findOne({})
        return res.status(200).json({error:false, message:"Successfully fetched data", maintainanceData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const ManageNotification = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const activeOrderCount = await order.aggregate([
            {
              $match: {
                is_offline: false,
                seen: false,
              },
            },
            {
              $group: {
                _id: "$order_status",
                count: { $sum: 1 },
              },
            },
            {
                $group: {
                  _id: null, // Remove grouping key to calculate total
                  statuses: { $push: { order_status: "$_id", count: "$count" } },
                  total: { $sum: "$count" },
                },
              },
              {
                $project: {
                  _id: 0,
                  statuses: 1,
                  total: 1,
                },
              },
        ]);        
        const scanOrderCount = await order.countDocuments({is_offline:true,seen:false})
        const queryCount = await query.countDocuments({seen:false})
        const redeemReqCount = await redeemReq.countDocuments({ status: "requested" , seen:false});
        return res.status(200).json({error:false, message:"Fetched unseen data", activeOrderCount,scanOrderCount,queryCount , redeemReqCount});
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const updateSeen = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { tab, id } = req.query
        if(tab == "query"){
            await query.updateMany({seen:false},{seen:true})
        } 
        if(tab == "scans" || tab == "orders"){
            await order.findOneAndUpdate({_id:id,seen:false},{seen:true})
        }
        if(tab == "redeems"){
            await redeemReq.updateMany({seen:false},{seen:true})
        }
        return res.status(200).json({error:false, message:"Successfully update seen count"})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

module.exports = {
    login,
    sendOtp,
    verifyOtp,
    resendOtp,
    aboutAdmin,
    adminDetails,
    EnableDisableMaintainance,
    maintainanceModeDetails,
    ManageNotification,
    updateSeen
};