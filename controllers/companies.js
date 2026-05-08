const companyModel = require('../models/company')
const {validationResult} = require('express-validator')

const companyListing = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const companyData = await companyModel.find()
        return res.status(200).json({message:'Successfully fetched data', error: false, companyData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const addCompany = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { company_name, company_logo} = req.body
        const company = new companyModel(
            {
                company_name:company_name,
                company_logo:company_logo,
            }
        )
        await company.save()
        return res.status(200).json({message:'Successfully saved you company', error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

module.exports = {
    companyListing,
    addCompany
};