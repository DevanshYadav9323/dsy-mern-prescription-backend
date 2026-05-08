const dashboardController = require('../controllers/dashboard')
const { check } = require('express-validator')
var express = require('express');
const { authenticateCustomer, authenticateAdmin , authenticateShop } = require('../lib/auth');
const router = express.Router();

router.get('/get_dashboard_details',[authenticateShop],
function (req, res) {
    dashboardController.getDashboardDetails(req,res);
});

router.get('/scan_analytics', [authenticateShop],
function (req, res) {
    dashboardController.scanAnalyticsLastSixMonths(req,res);
});

router.get('/get_datablock_details', [authenticateShop],
function (req, res) {
    dashboardController.getDatablockDetails(req,res);
});


router.get("/monthly_reports", [authenticateShop], function (req, res) {
    dashboardController.getMonthlyReports(req, res);
});



module.exports = router;
