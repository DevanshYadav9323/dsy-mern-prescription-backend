const cartsModel = require('../models/cart')
const offerModel = require('../models/offer')
const productModel = require('../models/product')
const {validationResult} = require('express-validator')
const dayjs = require('dayjs')
var isSameOrBefore = require('dayjs/plugin/isSameOrBefore')
dayjs.extend(isSameOrBefore)
var isSameOrAfter = require('dayjs/plugin/isSameOrAfter')
dayjs.extend(isSameOrAfter)


const cartListing = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const cartData = await cartsModel.find({customer_id:_id}).populate("shop_id",["shop_name"])
        res.status(200).json({message:'Successfully fetched data', error: false, cartData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const addToCart = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const {  company_id, product_id, shop_id } = req.body
        const foundProduct = await productModel.findOne({_id:product_id,is_deleted:false})
        if(!foundProduct){
            return res.status(200).json({message:"Product doesn't exists", error: true})
        }
        const pro = await cartsModel.findOne({customer_id:_id,'products.product_id':product_id})
        if(pro){
            return res.status(200).json({message:'Successfully added to your cart' , error: false}) 
        }
        let product = {
            company_id:company_id,
            product_id:product_id,
            quantity:foundProduct.quantity,
            unit:foundProduct.unit,
            product_name:foundProduct.product_name,
            product_image:foundProduct.product_image,
            count:1, 
            price: foundProduct.price 
        }
        const cartData = await cartsModel.findOneAndUpdate({customer_id:_id},{$push:{products:product},shop_id:shop_id,customer_id:_id},{upsert:true,returnDocument:'after'})
        return res.status(200).json({message:'Successfully added to your cart', error: false, cartData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const updateCart = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const {product_id, count} = req.body
        if(count == 0){
            const cartData = await cartsModel.findOne({customer_id:_id})
            const filteredProducts =  cartData.products.filter((val) => String(val.product_id) != String(product_id))
            await cartsModel.updateOne({customer_id: _id},{products:filteredProducts})
            return res.status(200).json({message:"Successfully updated cart", error: false}) 
        }
        await cartsModel.findOneAndUpdate(
            { 'customer_id': _id, 'products.product_id': product_id },
            { $set: { 'products.$.count': count } },
        )
        return res.status(200).json({message:"Successfully updated cart", error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const updateShop = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const { shop_id } = req.query
        const cartPresent = await cartsModel.findOne({customer_id:_id})
        if(!cartPresent){
           return res.status(200).json({message:"Cart is empty", error: true})
        }

        await cartsModel.findOneAndUpdate({customer_id:_id},{shop_id:shop_id})
        return res.status(200).json({message:"Successfully updated shop", error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}
module.exports = {
    cartListing,
    addToCart,
    updateCart,
    updateShop
};