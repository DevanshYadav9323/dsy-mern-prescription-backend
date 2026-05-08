const categoryModel = require('../models/category')
const {validationResult} = require('express-validator')

const categoryListing = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const categoryData = await categoryModel.find()
        return res.status(200).json({message:'Successfully fetched data', error: false, categoryData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const addCategory = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { category, category_image} = req.body
        const Category = new categoryModel(
            {
                category:category,
                category_image:category_image,
            }
        )
        await Category.save()
        return res.status(200).json({message:'Successfully saved you category', error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const deleteCategory = async (req, res) => {
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
        await categoryModel.findByIdAndDelete(id)
        return res.status(200).json({message:'Successfully deleted your category', error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

module.exports = {
    categoryListing,
    addCategory,
    deleteCategory
};