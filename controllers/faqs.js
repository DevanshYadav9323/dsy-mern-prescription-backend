const {validationResult} = require('express-validator');
const faq = require('../models/faq');

const faqListing = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const faqData = await faq.find()
        return res.status(200).json({message:"Successfully fetched data", error: false, faqData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

module.exports = {
    faqListing
  };