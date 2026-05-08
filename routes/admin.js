var express = require('express');
const adminsController = require('../controllers/admin')
var router = express.Router();
const { check } = require('express-validator');
const { authenticateAdmin } = require('../lib/auth');

router.post('/admin_login', [
    check('email','Please enter valid email').notEmpty(),
    check('password','Please enter valid password').notEmpty()
  ], function (req, res) {
    adminsController.login(req, res);
});
 
router.get('/admin_details', [authenticateAdmin], 
function (req, res) {
  adminsController.adminDetails(req, res);
});

router.post('/about', [authenticateAdmin], [
  check('firstname', 'Please enter valid firstname').notEmpty(),
  check('lastname', 'Please enter valid lastname').notEmpty(),
], function (req, res) {
  adminsController.aboutAdmin(req, res);
});

router.post('/send_otp', [
  check('email', 'Please enter valid email id').isEmail().notEmpty(),
], function (req, res) {
  adminsController.sendOtp(req, res);
});

router.post('/resend_otp', [
  check('email', 'Please enter valid email id').isEmail().notEmpty(),
], function (req, res) {
  adminsController.resendOtp(req, res);
});

router.post('/verify_otp', [
  check('email', 'Please enter valid email id').isEmail().notEmpty(),
  check('otp', 'Please enter valid OTP').notEmpty()
], function (req, res) {
  adminsController.verifyOtp(req, res);
});

router.post('/enable_disable_maintainance',[authenticateAdmin], [
  check('on_maintainance', 'Please enter boolean for maintainance').notEmpty()
], function (req, res) {
  adminsController.EnableDisableMaintainance(req, res);
});

router.get('/maintainance_details',[authenticateAdmin], function (req, res) {
  adminsController.maintainanceModeDetails(req, res);
});

router.get('/update_seen',[authenticateAdmin],[
  check('tab', 'Please enter tab').notEmpty()
], function (req, res) {
  adminsController.updateSeen(req, res);
});

router.get('/seen_count',[authenticateAdmin],[
], function (req, res) {
  adminsController.ManageNotification(req, res);
});

module.exports = router;
