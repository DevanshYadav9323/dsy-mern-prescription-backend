var express = require('express');
var router = express.Router();
var razorpayController = require('../controllers/razorpay');
const { check } = require('express-validator');
const { authenticateCustomer } = require('../lib/auth');

router.post('/order', [
    check('order_id', 'Please enter valid order id').isMongoId().notEmpty()
], function (req, res) {
    razorpayController.createOrder(req, res);
});

router.post('/webhook', function (req, res) {
    razorpayController.webhook(req, res);
});

module.exports = router;