const { mongoose } = require('mongoose');
const slotModel = require('../models/slot')
const {validationResult} = require('express-validator')
const ObjectId = mongoose.Types.ObjectId;

const slotListing = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { shop_id } = req.query
        const slotData = await slotModel.find({shop_id:shop_id})
        return res.status(200).json({message:'Succesfully fetched data', error: false , slotData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const slotDetails = async (req, res) => {
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
        const slotData = await slotModel.findOne({shop_id:new ObjectId(id)})
        return res.status(200).json({message:'Succesfully fetched data', error: false , slotData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const addSlot = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { shop_id, slots } = req.body
        const slot = await slotModel.updateOne({shop_id:shop_id},{
            shop_id:shop_id,
            slots:slots,
        },{upsert:true})
        return res.status(200).json({message:"Successfully saved your slot" , error: false })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const deleteSlot = async (req, res) => {
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
        await slotModel.findByIdAndDelete(id)
        return res.status(200).json({message:'Successfully deleted slot' , error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}
module.exports = {
    slotListing,
    addSlot,
    deleteSlot,
    slotDetails
};
