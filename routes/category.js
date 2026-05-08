const categoryController = require('../controllers/categories')
const { check } = require('express-validator')
var express = require('express');
const router = express.Router();

router.get('/category_listing',
function (req, res) {
    categoryController.categoryListing(req, res);
});

router.post('/add_category', [
    check('category', 'Please enter company').notEmpty(),
    check('category_image','Please enter category image').notEmpty(),
  ], function (req, res) {
    categoryController.addCategory(req, res);
});

router.get('/delete_category', [
     check('id','Please enter valid category id').notEmpty()
  ], function (req, res) {
    categoryController.deleteCategory(req, res);
});

module.exports = router;
