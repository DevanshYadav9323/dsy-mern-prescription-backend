var express = require('express');
var router = express.Router();
const systemConfigController = require('../controllers/systemConfigs');
const { authenticateAdmin } = require('../lib/auth');
const { check } = require('express-validator');

router.post('/add_system_config', [authenticateAdmin], [
    check('scan_rewards', 'Please enter scan rewards').notEmpty(),
    check('referrer_rewards','Please enter refer rewards').notEmpty(),
    check('referred_rewards','Please enter refer rewards').notEmpty(),
  ], function (req, res) {
    systemConfigController.AddSystemConfig(req, res);
});

router.get('/system_details', [authenticateAdmin], function (req, res) {
  systemConfigController.systemDetails(req, res);
});

module.exports = router
