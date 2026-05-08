var express = require('express');
var router = express.Router();
const shopsController = require('../controllers/shops')
const { check } = require('express-validator');
const { authenticateAdmin, authenticateShop, authenticateCustomer } = require('../lib/auth');

router.get('/shop_listing',
  function (req, res) {
    shopsController.shopsListing(req, res);
  });

router.get('/shop_listing_admin', [authenticateAdmin],
  function (req, res) {
    shopsController.shopsListingAdmin(req, res);
  });

router.get("/get_milestone_progress", [authenticateCustomer], function (req, res) {
    shopsController.getMilestoneProgress(req, res);
});

router.get('/shop_details', [authenticateShop],
  function (req, res) {
    shopsController.shopDetails(req, res);
  });

router.post('/add_shop', [
  check('shop_name', 'Please enter shop name').notEmpty(),
  check('street', 'Please enter shop street').notEmpty(),
  check('zip_code', 'Please enter shop zip code').notEmpty(),
  check('city', 'Please enter shop city').notEmpty(),
  check('state', 'Please enter state').notEmpty(),
  check('rewards', 'Please enter shop rewards').notEmpty(),
  check('shop_logo', 'Please enter valid shop logo').notEmpty(),
  check('phone_numbers').custom((arr) => {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error('At least one phone number is required');
    }

    const hasValid = arr.some(
      (item) => item.number && item.number.trim() !== ""
    );

    if (!hasValid) {
      throw new Error('At least one valid phone number is required');
    }

    const hasLogin = arr.some(
      (item) => item.number && item.number.trim() !== "" && item.is_login === true
    );
    if (!hasLogin) {
      throw new Error('At least one phone number must be marked for login');
    }

    return true;
  }),
  check('summary_time').optional({ checkFalsy: true }).custom((val) => {
    if (!/^([01]\d|2[0-3]):(00|30)$/.test(val)) {
      throw new Error('Summary time must be on a half-hour slot (HH:00 or HH:30)');
    }
    return true;
  }),

  // check('shop_description', 'Please enter shop description').notEmpty(),           
  // check('milestone_description', 'Please enter milestone description').notEmpty(),

  check('new_user_rewards').isArray().optional(),

], function (req, res) {
  shopsController.addShop(req, res);
});

router.post('/edit_shop', [
  check('shop_name', 'Please enter shop name').notEmpty(),
  check('street', 'Please enter shop street').notEmpty(),
  check('zip_code', 'Please enter shop zip code').notEmpty(),
  check('city', 'Please enter shop city').notEmpty(),
  check('state', 'Please enter state').notEmpty(),
  check('rewards', 'Please enter shop rewards').notEmpty(),
  check('shop_logo', 'Please enter valid shop logo').notEmpty(),
  check('new_user_rewards').optional().isArray(),

  check('phone_numbers').custom((arr) => {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error('At least one phone number is required');
    }

    const hasValid = arr.some(
      (item) => item.number && item.number.trim() !== ""
    );

    if (!hasValid) {
      throw new Error('At least one valid phone number is required');
    }

    const hasLogin = arr.some(
      (item) => item.number && item.number.trim() !== "" && item.is_login === true
    );
    if (!hasLogin) {
      throw new Error('At least one phone number must be marked for login');
    }

    return true;
  }),
  check('summary_time').optional({ checkFalsy: true }).custom((val) => {
    if (!/^([01]\d|2[0-3]):(00|30)$/.test(val)) {
      throw new Error('Summary time must be on a half-hour slot (HH:00 or HH:30)');
    }
    return true;
  }),

], function (req, res) {
  shopsController.editShop(req, res);
});

router.post('/edit_shop_details', [authenticateShop], [
  check('shop_name', 'Please enter shop name').notEmpty(),
  check('street', 'Please enter shop street').notEmpty(),
  check('zip_code', 'Please enter shop zip code').notEmpty(),
  check('city', 'Please enter shop city').notEmpty(),
  check('state', 'Please enter state').notEmpty(),
  check('phone_no', 'Please enter phone number').notEmpty(),
], function (req, res) {
  shopsController.editShopDetails(req, res);
});

router.get('/delete_shop', [
  check('id', 'Please enter valid shop id').notEmpty()
], function (req, res) {
  shopsController.deleteShop(req, res);
});

router.post('/login_shop', [
  check('phone_no', 'Please enter shop phone number').notEmpty(),
], function (req, res) {
  shopsController.shopLogin(req, res);
});

router.post('/resend_otp', [
  check('phone_no', 'Please enter shop phone number').notEmpty(),
], function (req, res) {
  shopsController.resendShopOtp(req, res);
});

router.post('/verify_otp', [
  check('phone_no', 'Please enter shop phone number').notEmpty(),
  check('otp', 'Please enter OTP').notEmpty(),
], function (req, res) {
  shopsController.verifyOtp(req, res);
});

router.get('/verify_code', [
], function (req, res) {
  shopsController.verifyQR(req, res);
});

router.get('/list_settlement', [authenticateShop],
  function (req, res) {
    shopsController.listSettlements(req, res);
  });

router.get('/list_settlement_admin', [authenticateAdmin],
  check('shop_id', 'Please enter shop id').notEmpty(),
  function (req, res) {
    shopsController.listSettlementsAdmin(req, res);
  });

router.post('/settle_settlements', [
  authenticateAdmin,
  check('ids', "Please enter settlement ID's").notEmpty(),
], function (req, res) {
  shopsController.settleSettlements(req, res);
});

router.get("/settlement_details", [authenticateShop],
  function (req, res) {
    shopsController.listSettlementGroups(req, res);
  }
);

router.get(
  "/offer_details", [authenticateShop],
  function (req, res) {
    shopsController.listOfferDetails(req, res);
  }
);

router.get(
  "/amount_report",
  [authenticateShop],
  (req, res) => {
    shopsController.listShopAmountReport(req, res);
  }
);

router.get(
  "/offer_redeem_report",
  [authenticateShop],
  (req, res) => {
    shopsController.offerRedeemReportForShop(req, res);
  }
);

module.exports = router;