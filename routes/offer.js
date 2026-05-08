var express = require('express');
var router = express.Router();
const offersController = require('../controllers/offers')
const { check } = require('express-validator');
const { authenticateAdmin, authenticateCustomer, authenticateShop } = require('../lib/auth');

router.get('/offer_listing',
function (req, res) {
    offersController.offersListing(req, res);
});

router.get("/offer_redeem_status", [authenticateCustomer], function (req, res) {
    offersController.offerRedeemStatus(req, res);
});

router.get('/offer_listing_admin', [authenticateAdmin],
function (req, res) {
    offersController.offersListingAdmin(req, res);
});

router.get('/offer_listing_for_shop_panel', [authenticateShop],
  function (req, res) {
      offersController.offersListingForShopPanel(req, res);
  });

router.get('/offer_details', [authenticateAdmin], [
  check('id', 'Please enter valid offer id').isMongoId().notEmpty(),
],function (req, res) {
    offersController.offerDetails(req, res);
});

router.post('/add_offer', [authenticateAdmin], [
  // check('company_id', 'Please enter valid company id').isMongoId().notEmpty(),
  check('offer_start','Please enter start date').notEmpty(),
  check('offer_expiry','Please enter expiry date').notEmpty(),
  // check('product_details','Product details required').notEmpty().isArray(),
  check('offer_description','Please enter offer description').notEmpty(),
  check('offer_banner','Please upload offer banner').notEmpty(),
  check('offer_display','Please upload offer display').notEmpty(),
  // check('redeem_limit','Please enter redeem limit').isNumeric().notEmpty(),
  check('offer_title','Please enter offer title').isString().notEmpty(),
  check('is_featured','Please enter featured').isBoolean().notEmpty(),
  check('offer_type','Please enter offer type').isString().notEmpty(),
  ], function (req, res) {
    offersController.addOffer(req, res);
});

router.post('/edit_offer', [authenticateAdmin], [
    check('id', 'Please enter valid offer id').isMongoId().notEmpty(),
    // check('company_id', 'Please enter valid company id').isMongoId().notEmpty(),
    check('offer_start','Please enter start date').notEmpty(),
    check('offer_expiry','Please enter expiry date').notEmpty(),
    // check('product_details','Product details required').notEmpty().isArray(),
    check('offer_description','Please enter offer description').notEmpty(),
    check('offer_banner','Please upload offer banner').notEmpty(),
    check('offer_display','Please upload offer display').notEmpty(),
    // check('redeem_limit','Please enter redeem limit').isNumeric().notEmpty(),
    check('offer_title','Please enter redeem limit').isString().notEmpty(),
    check('is_featured','Please enter redeem limit').isBoolean().notEmpty()
  ], function (req, res) {
    offersController.editOffer(req, res);
  });

  router.post('/clone_offer', [authenticateAdmin], [
    check('id', 'Please enter valid offer id').isMongoId().notEmpty(),
    // check('company_id', 'Please enter valid company id').isMongoId().notEmpty(),
    check('offer_start','Please enter start date').notEmpty(),
    check('offer_expiry','Please enter expiry date').notEmpty(),
    // check('product_details','Product details required').notEmpty().isArray(),
    check('offer_description','Please enter offer description').notEmpty(),
    check('offer_banner','Please upload offer banner').notEmpty(),
    check('offer_display','Please upload offer display').notEmpty(),
    // check('redeem_limit','Please enter redeem limit').isNumeric().notEmpty(),
    check('offer_title','Please enter redeem limit').isString().notEmpty(),
    check('is_featured','Please enter redeem limit').isBoolean().notEmpty()
  ], function (req, res) {
    offersController.cloneOffer(req,res);
  });

router.get('/delete_offer', [authenticateAdmin], [
  check('id','Please enter valid offer id').notEmpty()
], function (req, res) {
  offersController.deleteOffer(req, res);
});

router.get('/redeem_offer', [authenticateCustomer],
function (req, res) {
  offersController.redeemOffer(req, res);
});

router.post('/delete_offers', [authenticateAdmin], [
  check('offers', 'Please enter valid offers').notEmpty(),
],function (req, res) {
    offersController.deleteOffers(req, res);
});

router.post('/add_label', [authenticateAdmin], [
  check('title', 'Please enter a valid label title').notEmpty(),
],function (req, res) {
    offersController.addLabel(req, res);
});

router.post('/edit_label', [authenticateAdmin], [
  check('id', 'Please provide valid label ID').notEmpty(),
  check('title', 'Please enter a valid title').notEmpty(),
], offersController.editLabel);

router.post('/delete_label', [authenticateAdmin], [
  check('id', 'Please provide valid label ID').notEmpty(),
], offersController.deleteLabel);

router.get('/get_all_dropdown_data', [authenticateAdmin],
  function (req, res) {
    offersController.getDropdownData(req, res);
});

router.get('/get_all_labels', [authenticateAdmin],
  function (req, res) {
    offersController.getAllLabels(req, res);
});

router.get('/hide_unhide_offer', [authenticateAdmin], [
  check('id','Please enter valid offer id').notEmpty()
], function (req, res) {
  offersController.hideOffer(req, res);
});

router.post('/hide_unhide_offers', [authenticateAdmin], [
  check('offers', 'Please enter valid offers').notEmpty(),
  check('type', 'Please enter valid type').notEmpty(),
],function (req, res) {
    offersController.HideUnhideOffers(req, res);
});

router.post('/change_order_offers', [authenticateAdmin], [
  check('offers', 'Please enter valid offers').notEmpty(),
],function (req, res) {
    offersController.changeOfferOrder(req, res);
});

router.post('/add_favourite_offer',[authenticateCustomer], [
    check('offer_id', 'Please enter valid offer_id').isMongoId().notEmpty(),
 ], function (req, res) {
    offersController.addFavouriteOffer(req, res);
});

router.get('/delete_favourite_offer',[authenticateCustomer], [
  check('offer_id', 'Please enter valid offer_id').isMongoId().notEmpty(),
], function (req, res) {
  offersController.deleteFavouriteOffer(req, res);
});

router.get('/get_favourite_offers', [authenticateCustomer],
  function (req, res) {
    offersController.getFavouriteOffers(req, res);
});

router.post("/change_order_labels",[authenticateAdmin],
    [check("labels", "Please enter valid labels").notEmpty()],
    function (req, res) {
        offersController.changeLabelOrder(req, res);
    }
);

router.get('/get_featured_offers', [authenticateAdmin],
  function (req, res) {
      offersController.getFeaturedOffers(req, res);
  });

  router.post('/update_featured_banner_order', [authenticateAdmin], [
    check('offers', 'Offers are required').notEmpty(),
  ], function (req, res) {
    offersController.updateFeaturedBannerOrder(req, res);
  });

  router.post('/get_cities_by_state', [authenticateAdmin], [
    check('state', 'State is required').notEmpty(),
  ], function (req, res) {
    offersController.getCitiesByState(req, res);
  });

  router.post('/get_localities_by_city', [authenticateAdmin], [
    check('state', 'State is required').notEmpty(),
    check('city', 'City is required').notEmpty(),
    check('country', 'Country is required').notEmpty(),
  ], function (req, res) {
    offersController.getLocalitiesByCity(req, res);
  });


  router.get(
    "/search_offer",
    [authenticateCustomer],
    function (req, res) {
      offersController.searchOffer(req, res);
    }
  );

module.exports = router;