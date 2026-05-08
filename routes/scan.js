var express = require('express');
var router = express.Router();
const scansController = require('../controllers/scans')
const { authenticateCustomer, authenticateAdmin, authenticateShop } = require('../lib/auth')
const { check, body } = require('express-validator')

router.get('/scan_order_listing', [authenticateAdmin] ,
function (req, res) {
    scansController.scanOrderListing(req, res);
});

router.get('/scan_order_listing_for_shop', [authenticateShop] ,
function (req, res) {
    scansController.scanOrderListingForShop(req,res);
});

router.get('/scan-details', [authenticateShop] ,
function (req, res) {
    scansController.scanOrderDetailsForShop(req,res);
});

router.get('/scan_order_details', [authenticateAdmin], [
    check('id', 'Please enter valid order id').isMongoId().notEmpty(),
  ], function (req, res) {
    scansController.scanOrderDetails(req, res);
});

router.post('/add_scan_order', [authenticateCustomer]
, function (req, res) {
  scansController.addScanOrder(req, res);
});

// router.post('/update_scan_order', [
//   check('customer_id', 'Please enter valid customer id').isMongoId().notEmpty(),
//   check('shop', 'Please enter valid shop').notEmpty(),
//   check('order_details', 'Please enter valid order details').notEmpty(),
// ], function (req, res) {
//   scansController.saveScanOrder(req, res);
// });

router.post(
  "/update_scan_order",
  [
    body("customer_id")
      .if(body("order_status").not().equals("cancelled"))
      .isMongoId()
      .withMessage("Please enter valid customer id"),
    body("shop")
      .if(body("order_status").not().equals("cancelled"))
      .notEmpty()
      .withMessage("Please enter valid shop"),
    body("order_details")
      .if(body("order_status").not().equals("cancelled"))
      .notEmpty()
      .withMessage("Please enter valid order details"),
  ],
  scansController.saveScanOrder
);

router.get('/delete_scan_order', [authenticateAdmin], [
  check('id', 'Please enter valid order id').isMongoId().notEmpty(),
], function (req, res) {
  scansController.deleteScanOrder(req, res);
});

router.post('/delete_scan_image', [authenticateAdmin], [
  check('scanOrderId', 'Please enter valid order id').isMongoId().notEmpty(),
  check('imageUrl', 'Please provide valid image URL').isString().notEmpty(),
], function (req, res) {
  scansController.deleteScanImage(req, res);
});

router.post(
  "/analyze_bills",
  [authenticateAdmin],
  [
    body("bills")
      .isArray({ min: 1 })
      .withMessage("Please provide at least one bill URL"),
    body("bills.*")
      .isString()
      .withMessage("Each bill URL must be a string"),
  ],
  scansController.extractBillsData
);

router.post(
  "/delete_s3_scan_images",
  [authenticateCustomer],
  [
    check("imageUrls", "Please provide valid S3 image URLs")
      .isArray({ min: 1 })
      .custom((arr) => arr.every((url) => typeof url === "string")),
  ],
  function (req, res) {
    scansController.deleteCustomerScanImages(req, res);
  }
);

router.post(
  "/reprocess_scan_order",
  [authenticateAdmin],
  [
    body("order_id")
      .isMongoId()
      .withMessage("Please enter valid order id"),
  ],
  scansController.reprocessScanOrder
);

router.post(
  "/calculate_order_rewards",
  [
    body("customer_id")
      .if(body("order_status").not().equals("cancelled"))
      .isMongoId()
      .withMessage("Please enter valid customer id"),
    body("shop")
      .if(body("order_status").not().equals("cancelled"))
      .notEmpty()
      .withMessage("Please enter valid shop"),
    body("order_details")
      .if(body("order_status").not().equals("cancelled"))
      .notEmpty()
      .withMessage("Please enter valid order details"),
  ],[authenticateAdmin],
  scansController.calcOrderRewards
);

module.exports = router;
