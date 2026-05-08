const companyController = require('../controllers/companies')
const { check } = require('express-validator')
var express = require('express');
const router = express.Router();

router.get('/company_listing',
function (req, res) {
    companyController.companyListing(req, res);
});

router.post('/add_company', [
    check('company_logo', 'Please enter company').notEmpty(),
    check('company_name','Please enter company logo').notEmpty(),
  ], function (req, res) {
    companyController.addCompany(req, res);
});

module.exports = router;
