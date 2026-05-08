const queryModel = require("../models/query")
const customerModel = require("../models/customer")
const {validationResult} = require('express-validator');
const dayjs = require("dayjs");
const { sendEmail } = require("../lib/helper");

const queryListing = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const queryData = await queryModel.find({customer_id:_id})
        return res.status(200).json({message:"Successfully fetched queries data", error: false , queryData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const addQuery = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const { query } = req.body
        const customer = await customerModel.findById(_id)
        if (!customer) {
            return res.status(200).json({
                message: "Customer not found",
                error: true,
            });
        }        
        const queryData = await queryModel.create({customer_id:_id,query:query})
        var mailData = {
            email: "shopkya.bhavya@gmail.com",
            templateId: "d-ec2c6c3732454bd1ac8fa74cd5c0489c",
            dynamic_template_data: {
              name: customer.name,
              date: dayjs(queryData.createdAt).format("YYYY-MM-DD"),
              time: dayjs(queryData.createdAt).format("h:mm A"),
              query:query,
              subject: "Customer query from ShopKya",
            },
        };
        // await sendEmail(mailData);
        return res.status(200).json({message:"Successfully saved your query" , error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const queryListingAdmin = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const queryData = await queryModel.find().populate('customer_id').sort({ createdAt: "desc" })
        return res.status(200).json({message:"Successfully fetched queries", error: false , queryData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}



module.exports = {
    queryListing,
    addQuery,
    queryListingAdmin,
};