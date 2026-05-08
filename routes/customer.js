const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customers');
const { check } = require('express-validator');
const { authenticateCustomer, authenticateAdmin } = require('../lib/auth')

router.post('/login', [
    check('phone_no', 'Please enter valid phone number').isMobilePhone('en-IN').notEmpty(),
  ], function (req, res) {
    customersController.login(req, res);
});
  
router.post('/resend_otp', [
    check('phone_no', 'Please enter valid phone number').isMobilePhone('en-IN').notEmpty(),
  ], function (req, res) {
    customersController.resendOtp(req, res);
});
  
router.post('/verify_otp', [
    check('phone_no', 'Please enter valid phone number').isMobilePhone('en-IN').notEmpty(),
    check('otp', 'Please enter valid OTP').notEmpty()
  ], function (req, res) {
    customersController.verifyOtp(req, res);
});
  
router.post('/update_name', [
    check('id', 'Please enter valid customer id').isMongoId().notEmpty(),
    check('first_name', 'Please enter valid name').notEmpty(),
    check('last_name', 'Please enter valid name').notEmpty(),
    check('email', 'Please enter valid name').notEmpty(),
  ], function (req, res) {
    customersController.updateCustomerName(req, res);
});

router.get('/verify_referral_qr', [
], function (req, res) {
  customersController.verifyReferralQR(req, res);
});

router.post('/about', [
  check('id', 'Please enter valid customer id').isMongoId().notEmpty(),
  check('dob', 'Please enter valid birth date').notEmpty(),
  check('gender', 'Please enter valid gender').notEmpty(),
], function (req, res) {
  customersController.aboutCustomer(req, res);
});

router.post('/refer', [
  check('id', 'Please enter valid customer id').isMongoId().notEmpty(),
  check('ref_code', 'Please enter valid birth date').notEmpty(),
], function (req, res) {
  customersController.addReferral(req, res);
});

router.post('/update', [authenticateCustomer] , [
  check('first_name', 'Please enter valid name').notEmpty(),
  check('last_name', 'Please enter valid name').notEmpty(),
  check('email', 'Please enter valid email').notEmpty(),
  check('phone_no', 'Please enter valid phone nuber').isMobilePhone('en-IN').notEmpty(),
  check('dob', 'Please enter valid birth date').notEmpty(),
  check('gender', 'Please enter gender').notEmpty(),
], function (req, res) {
  customersController.updateCustomer(req, res);
});

router.post('/add_address', [authenticateCustomer] , [
    check('title', 'Please enter valid title').notEmpty(),
    check('flat', 'Please enter valid flat').notEmpty(),
    check('area', 'Please enter valid area').notEmpty(),
  ], function (req, res) {
    customersController.updateCustomerAddress(req, res);
});

router.post('/update_address', [authenticateCustomer] , [
  check('id', 'Please enter valid address id').isMongoId().notEmpty(),
  check('title', 'Please enter valid title').notEmpty(),
  check('flat', 'Please enter valid flat').notEmpty(),
  check('area', 'Please enter valid area').notEmpty(),
], function (req, res) {
  customersController.editAddress(req, res);
});

router.get('/list_address', [authenticateCustomer] , 
  function (req, res) {
    customersController.listAddresses(req, res);
});

router.get('/delete_address', [authenticateCustomer],[
  check('id','Please enter valid address id').notEmpty()
], function (req, res) {
  customersController.deleteAddress(req, res);
});

router.get('/customer_listing_admin', [authenticateAdmin],[
], function (req, res) {
  customersController.customerListingAdmin(req, res);
});

router.post('/logout', [authenticateCustomer] , [
  check('device_token', 'Please enter valid device token').notEmpty(),
], function (req, res) {
  customersController.logout(req, res);
});

router.post('/update_bank_details', [authenticateCustomer], function (req, res) {
  customersController.updateBankDetails(req, res)
})

router.get('/customer_details', [authenticateCustomer] , 
  function (req, res) {
    customersController.customerDetails(req, res);
});

router.get(
    "/home_screen_data",
    [
        check("lat", "Please enter valid latitude").notEmpty(),
        check("lng", "Please enter valid longitude").notEmpty(),
    ],
    [authenticateCustomer],
    function (req, res) {
        customersController.homeScreenData(req, res);
    }
);

router.post('/add_manual_reward', [authenticateAdmin] , [
  check('id', 'Please enter valid cusotmer id').notEmpty(),
  check('rewards', 'Please enter valid rewards').notEmpty(),
  check('notify_user', 'Please enter notify user').notEmpty(),
], function (req, res) {
  customersController.addManualReward(req, res);
});

router.get('/send_otp', [authenticateCustomer] , 
  function (req, res) {
    customersController.sendOTP(req, res);
});

router.post('/delete_account', [authenticateCustomer] , 
  check('otp', 'Please enter valid OTP').notEmpty(),
  function (req, res) {
    customersController.deleteMyAccount(req, res);
});

router.post('/enable_disable_customer', [authenticateAdmin] , 
  check('is_disabled', 'Please enter is disabled').notEmpty(),
  check('customer_id', 'Please enter is customer id').notEmpty(),
  function (req, res) {
    customersController.enableDisableCustomer(req, res);
});

router.get('/redirect_app',
  function (req, res) {
    customersController.redirectApp(req, res);
});

router.post('/version_check', [authenticateCustomer] ,
  check('current_version', 'Please enter current version').notEmpty(),
  check('device_type', 'Please enter device type').notEmpty(),
  function (req, res) {
    customersController.versionCheck(req, res);
});

router.post('/get_personalised_deals', [authenticateCustomer] , [
  check('dob', 'Please enter valid birth date').notEmpty(),
  check('gender', 'Please enter gender').notEmpty(),
], function (req, res) {
  customersController.personalisedDeals(req, res);
});

router.get('/get_all_labels', [authenticateCustomer],
  function (req, res) {
    customersController.getAllLabels(req, res);
});

router.get('/get_label_offers', [authenticateCustomer],
  function (req, res) {
    customersController.getLabelOffers(req, res);
});

router.get('/total_coins_redeemed', [authenticateCustomer],
  function (req, res) {
    customersController.totalCoinsRedeemed(req, res);
});

router.get('/rewards', [authenticateCustomer],
  function (req, res) {
    customersController.rewardsTab(req, res);
});

router.get('/get_all_rewards', [authenticateCustomer],
  function (req, res) {
    customersController.getAllRewards(req, res);
});

router.get('/get_all_rewards_for_shop', [authenticateCustomer],
  function (req, res) {
    customersController.getAllRewardsForShop(req, res);
});

router.get('/get_backend_url',
  function (req, res) {
    customersController.getBackendUrl(req, res);
});

module.exports = router;
