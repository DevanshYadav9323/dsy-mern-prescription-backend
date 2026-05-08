const faqController = require('../controllers/faqs')
const { check } = require('express-validator')
var express = require('express');
const { authenticateCustomer } = require('../lib/auth');
const router = express.Router();

router.get('/faq_listing',[authenticateCustomer],
function (req, res) {
    faqController.faqListing(req, res);
});

module.exports = router;
