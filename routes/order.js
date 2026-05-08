var express = require('express');
var router = express.Router();
const ordersController = require('../controllers/orders')
const { authenticateCustomer, authenticateAdmin } = require('../lib/auth')
const { check } = require('express-validator')

router.get('/order_listing', [authenticateCustomer] ,
function (req, res) {
    ordersController.orderListing(req, res);
});

router.get('/order_listing_admin', [authenticateAdmin],
function (req, res) {
    ordersController.orderListingAdmin(req, res);
});

router.get('/order_listing_meta', [authenticateAdmin],
  function (req, res) {
      ordersController.orderListingMeta(req, res);
  });

router.post('/add_order', [authenticateCustomer], [
    check('start_time','Please enter start time').notEmpty(),
    check('end_time','Please enter end time').notEmpty(),
    check('address_id','Please enter address id').isMongoId().notEmpty(),
  ], function (req, res) {
    ordersController.addOrder(req, res);
});

router.post('/update_order', [authenticateAdmin], [  //[authenticateAdmin]
  check('id', 'Please enter valid order id').isMongoId().notEmpty(),
  check('order_details','Please enter order details').notEmpty(),
], function (req, res) {
  ordersController.updateOrderByAdmin(req, res);
});

router.post('/approve_order', [authenticateAdmin], [
  check('id', 'Please enter valid order id').isMongoId().notEmpty(),
  check('product_id', 'Please enter valid product id').isMongoId().notEmpty(),
  check('quantity','Please enter quantity').notEmpty(),
  check('order_status','Please enter order status').notEmpty(),
  check('reward','Please enter reward ').notEmpty(),
], function (req, res) {
  ordersController.approveOrder(req, res);
});

router.post('/confirm_order', [authenticateAdmin], [
  check('order_id', 'Please enter valid order id').isMongoId().notEmpty(),
  check('order_status','Please enter order status').notEmpty()
], function (req, res) {
  ordersController.confirmOrder(req, res);
});

router.post('/complete_order', [authenticateAdmin], [
  check('order_id', 'Please enter valid order id').isMongoId().notEmpty(),
  check('order_status','Please enter order status').notEmpty()
], function (req, res) {
  ordersController.completeOrder(req, res);
});

router.get('/order_details', [authenticateAdmin], [
  check('id', 'Please enter valid order id').isMongoId().notEmpty(),
], function (req, res) {
  ordersController.orderDetails(req, res);
});

router.get('/get_order_detail', [authenticateCustomer], [
  check('order_id', 'Please enter valid order_id').isMongoId().notEmpty(),
], function (req, res) {
  ordersController.getOrderDetail(req, res);
});

router.get('/delete_order', [authenticateAdmin], [
  check('id','Please enter valid order id').notEmpty()
], function (req, res) {
  ordersController.deleteOrder(req, res);
});


router.post('/webhook', function (req, res) {
  ordersController.webhookResponse(req, res);
});

router.post('/whatsapp', function (req, res) {
  ordersController.sendWhatsappMessage(req, res);
});

router.post('/update_order_by_user', [authenticateCustomer], [
  check('order_id', 'Please enter valid order id').isMongoId().notEmpty(),
  check('order_status','Please enter order status').notEmpty()
], function (req, res) {
  ordersController.updateOrderByUser(req, res);
});

module.exports = router;