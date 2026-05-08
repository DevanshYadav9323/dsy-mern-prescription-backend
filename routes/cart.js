const cartsController = require('../controllers/carts')
const { check } = require('express-validator')
var express = require('express');
const { authenticateCustomer } = require('../lib/auth');
const router = express.Router();

router.get('/cart_listing',[authenticateCustomer],
function (req, res) {
    cartsController.cartListing(req, res);
});

router.post('/add_to_cart',[authenticateCustomer], [
    check('company_id', 'Please enter valid company id').isMongoId().notEmpty(),
    check('product_id', 'Please enter valid product id').isMongoId().notEmpty(),
    check('shop_id','Please enter valid shop id').isMongoId().notEmpty(),
 ], function (req, res) {
    cartsController.addToCart(req, res);
});

router.post('/update_cart',[authenticateCustomer], [
    check('product_id', 'Please enter valid product id').isMongoId().notEmpty(),
    check('count','Please enter count').isNumeric().notEmpty(),
 ], function (req, res) {
    cartsController.updateCart(req, res);
});

router.get('/update_cart_shop',[authenticateCustomer], [
    check('shop_id','Please enter valid shop id').isMongoId().notEmpty(),
 ], function (req, res) {
    cartsController.updateShop(req, res);
});

module.exports = router;
