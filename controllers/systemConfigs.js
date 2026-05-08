const systemConfigModel = require('../models/systemConfig')
const {validationResult} = require('express-validator')

const systemDetails = async (req,res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { token } = req.query

        const systemData = await systemConfigModel.find({})
        return res.status(200).json({message:"successfully fetched data", error: false , systemData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const AddSystemConfig = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const keys = Object.keys(req.body);
        for (const key of keys) {
            const value = req.body[key];
            
            // Create a new document for each key-value pair
            await systemConfigModel.updateOne({type:key},{ type:key, reward:value },{upsert:true});
          }
          res.status(200).json({message:"Successfully saved rewards" , error: false })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

module.exports = {
    AddSystemConfig,
    systemDetails
};