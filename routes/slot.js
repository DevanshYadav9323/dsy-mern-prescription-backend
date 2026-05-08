var express = require('express');
var router = express.Router();
const slotController = require('../controllers/slots')
const { check } = require('express-validator');
const { authenticateCustomer, authenticateAdmin } = require('../lib/auth');

router.get('/slot_listing',[authenticateCustomer],
function (req, res) {
    slotController.slotListing(req, res);
});

router.get('/slot_details',[authenticateAdmin],
function (req, res) {
    slotController.slotDetails(req, res);
});

router.post('/add_slot', [authenticateAdmin], [
    check('shop_id', 'Please enter shop name').notEmpty(),
    check('slots','Please enter slots').isArray().notEmpty(),
  ], function (req, res) {
    slotController.addSlot(req, res);
});

router.get('/delete_slot', [
  check('id','Please enter valid slot id').notEmpty()
], function (req, res) {
  slotController.deleteSlot(req, res);
});

module.exports = router