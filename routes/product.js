var express = require('express');
var router = express.Router();
const productsController = require('../controllers/products')
const { check } = require('express-validator')
const multer = require('multer');
const path = require('path');
const { authenticateAdmin } = require('../lib/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${process.cwd()}/uploads`); 
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const uniqueFileName = file.fieldname + '-' + uniqueSuffix + extension;
    cb(null, uniqueFileName);
  },
});
const upload = multer({ storage: storage });

router.get('/product_listing',[
    //  check('category_id', 'Please enter valid category id').isMongoId().notEmpty(),
    ],
function (req, res) {
    productsController.productsListing(req, res);
});

router.get('/product_listing_admin',[authenticateAdmin],
function (req, res) {
 productsController.productsListingAdmin(req, res);
});

router.get('/add_product_modal_data', [authenticateAdmin],
  productsController.getAddProductModalData
);

router.post('/add_product', [ authenticateAdmin ], [
    check('company_id', 'Please enter valid company id').isMongoId().notEmpty(),
    check('product_name','Please enter product name').notEmpty(),
    check('product_image','Please enter product image').notEmpty(),
    // check('variant','Please enter Variant').notEmpty().isNumeric(),
    check('quantity','Please enter quantity').notEmpty().isNumeric(),
    check('unit','Please enter unit').notEmpty(),
    check('SKU','Please enter SKU').notEmpty(),
    check('description','Please enter SKU').notEmpty(),
    check('subcategory','Please enter subcategory').notEmpty(),
    check('category_id', 'Please enter valid category id').isMongoId().notEmpty(),
  ], function (req, res) {
    productsController.addProduct(req, res);
});

router.post(
  '/add_product_for_scan_order',
  [ authenticateAdmin ],
  [
    check('company_id', 'Please enter valid company id').isMongoId().notEmpty(),
    check('product_name','Please enter product name').notEmpty(),
    check('quantity','Please enter quantity').notEmpty().isNumeric(),
    check('unit','Please enter unit').notEmpty(),
    check('SKU','Please enter SKU').notEmpty(),
    check('subcategory','Please enter subcategory').notEmpty(),
    check('category_id', 'Please enter valid category id').isMongoId().notEmpty(),
  ],
  function (req, res) {
    productsController.addProductForScanOrder(req, res);
  }
);

router.get('/delete_product',[ authenticateAdmin ], [ 
  check('id','Please enter valid product id').notEmpty()
], function (req, res) {
 productsController.deleteProduct(req, res);
});

router.post('/edit_product',[ authenticateAdmin ], [ 
  check('product_image','Please enter product image').notEmpty(),
  check('product_name','Please enter product name').notEmpty(),
  check('id','Please enter valid product id').notEmpty(),
  // check('variant','Please enter Variant').notEmpty().isNumeric(),
  // check('description','Please enter SKU').notEmpty(),
], function (req, res) {
  productsController.editProduct(req, res);
});

router.post('/upload_product_csv', upload.single('file'),[ authenticateAdmin ], function (req, res) {
  productsController.uploadCSV(req, res);
});

router.get('/download_template',[ authenticateAdmin ], function (req, res) {
  productsController.downloadCsv(req, res);
});

router.get('/download_template',[ authenticateAdmin ], function (req, res) {
  productsController.downloadCsv(req, res);
});

router.post('/hide_unhide_products', [authenticateAdmin], [
  check('products', 'Please enter valid offers').notEmpty(),
  check('type', 'Please enter valid type').notEmpty(),
],function (req, res) {
  productsController.HideUnhideProducts(req, res);
});

router.get('/hide_unhide_product',[ authenticateAdmin ], function (req, res) {
  productsController.hideProduct(req, res);
});

router.post('/delete_products', [authenticateAdmin], [
  check('products', 'Please enter valid products').notEmpty(),
],function (req, res) {
  productsController.deleteProducts(req, res);
});

router.post('/upload_product_images', [authenticateAdmin], [
  // check('images', 'Please enter valid products').notEmpty(),
  // check('names', 'Please enter valid products').notEmpty(),
],function (req, res) {
  productsController.uploadImages(req, res);
});

router.get('/fetch_company_products', [ authenticateAdmin ], 
  [
   check('brand_id', 'Please enter valid company id').isMongoId().notEmpty(),
],
function (req, res) {
  productsController.fetchCompanyProducts(req, res);
});

router.get(
  "/download_products",
  [authenticateAdmin],
  function (req, res) {
    productsController.downloadProducts(req, res);
  }
);

router.get("/get_latest_sku", [authenticateAdmin], (req, res) => {
  productsController.getLatestSKU(req, res);
});

module.exports = router;