const express = require("express");
const router = express.Router();
const { body,check  } = require("express-validator");
const { authenticateBrand } = require("../lib/auth");
const { authenticateAdmin } = require("../lib/auth");

const brandController = require("../controllers/brand");


router.post(
  "/add",
  [
    body("brandName").notEmpty().withMessage("Brand name required"),
    body("description").notEmpty().withMessage("Description required"),
    body("contactPerson").notEmpty().withMessage("Contact person required"),
    body("phone")
      .isLength({ min: 10, max: 10 })
      .withMessage("Phone must be 10 digits"),
  ],
  brandController.addBrand
);


router.post('/edit_brand', [
  check('brandName', 'Please enter brand name').notEmpty(),
  check('contactPerson', 'Please enter contact person').notEmpty(),
  check('phone', 'Please enter phone number').notEmpty(),
], function (req, res) {
  brandController.editBrand(req, res);
});



router.get('/delete_brand', [
  check('id', 'Please enter valid brand id').notEmpty()
], function (req, res) {
  brandController.deleteBrand(req, res);
});



router.post(
  "/login",
  [
    body("phone")
      .isLength({ min: 10, max: 10 })
      .withMessage("Phone must be 10 digits"),
  ],
  brandController.brandLogin
);

router.post(
  "/resend_otp",
  [
    body("phone_no")
      .isLength({ min: 10, max: 10 })
      .withMessage("Phone must be 10 digits"),
  ],
  brandController.resendOtp
);

router.post(
  "/verify_otp",
  [
    body("phone_no")
      .isLength({ min: 10, max: 10 })
      .withMessage("Phone must be 10 digits"),
    body("otp").notEmpty().withMessage("OTP required"),
  ],
  brandController.verifyOtp
);



router.get('/brand_details', [authenticateBrand] , function (req, res) {
    brandController.brandDetails(req, res);
});


router.post('/editBrandDetails', [authenticateBrand], function (req, res) {
    brandController.editBrandDetails(req, res);
});



//  FOR ADMIN PANEL - Get all brands
router.get('/all_brands', [authenticateAdmin], function (req, res) {
  brandController.getAllBrands(req, res);
});

module.exports = router;
