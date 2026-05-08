const redeemReqController = require('../controllers/redeemReq')
const { check } = require('express-validator')
var express = require('express');
const { authenticateCustomer, authenticateAdmin } = require('../lib/auth');
const router = express.Router();

router.get('/req_listing_admin',[authenticateAdmin],
function (req, res) {
    redeemReqController.redeemReqListing(req, res);
});

router.post('/add_req',[authenticateCustomer], [
    check('coins', 'Please enter query').notEmpty(),
 ], function (req, res) {
    redeemReqController.requestRedeem(req, res);
});

router.get('/update_status',[authenticateAdmin],[
    check('id', 'Please enter id').notEmpty(),
], function (req, res) {
    redeemReqController.updateStatus(req, res);
});

router.post('/scan_to_redeem',[authenticateCustomer],[
    check('shop_id', 'Please enter shop id').notEmpty(),
    check('coins', 'Please enter coins').notEmpty(),
], function (req, res) {
    redeemReqController.scanToRedeem(req, res);
});

module.exports = router;
