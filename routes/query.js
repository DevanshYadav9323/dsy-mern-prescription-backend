const queryController = require('../controllers/query')
const { check } = require('express-validator')
var express = require('express');
const { authenticateCustomer, authenticateAdmin } = require('../lib/auth');
const router = express.Router();

router.get('/query_listing_admin',[authenticateAdmin],
function (req, res) {
    queryController.queryListingAdmin(req, res);
});

router.post('/add_query',[authenticateCustomer], [
    check('query', 'Please enter query').notEmpty(),
 ], function (req, res) {
    queryController.addQuery(req, res);
});

router.get('/query_listing',[authenticateCustomer],
function (req, res) {
    queryController.queryListing(req, res);
});

module.exports = router;
