var express = require('express');
var router = express.Router();
const { check } = require("express-validator");
const broadcastController = require("../controllers/brodcasts");
const { authenticateAdmin } = require('../lib/auth');

router.post('/create_broadcast', [
  check('title', 'Please enter title').notEmpty(),
  check('message', 'Please enter message').notEmpty(),
], [authenticateAdmin], function (req, res, next) {
    broadcastController.createBroadcast(req, res)
});

router.get('/get_all_data', [authenticateAdmin], function (req, res, next) {
    broadcastController.getAllData(req, res);
});

router.get('/get_all_broadcasts', [authenticateAdmin], function (req, res, next) {
  broadcastController.getAllBroadcast(req, res);
});


router.post('/filter_customers', [authenticateAdmin], function (req, res, next) {
  broadcastController.filterCustomers(req, res);
});

router.post('/get_products', [authenticateAdmin], function (req, res, next) {
  broadcastController.getProducts(req, res);
});

router.get('/get_customers', [authenticateAdmin], function (req, res, next) {
  broadcastController.getCustomers(req, res);
});

router.get('/delete_broadcast', [authenticateAdmin], function (req, res, next) {
  broadcastController.deleteBroadcast(req, res);
});

module.exports = router