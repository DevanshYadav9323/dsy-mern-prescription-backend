const noteController = require('../controllers/notes')
const { check } = require('express-validator')
var express = require('express');
const { authenticateCustomer } = require('../lib/auth');
const router = express.Router();

router.get('/notes_listing',[authenticateCustomer],
function (req, res) {
    noteController.notesListing(req, res);
});

router.post('/add_note',[authenticateCustomer], [
    check('title', 'Please enter title').notEmpty(),
    check('note', 'Please enter note').notEmpty(),
 ], function (req, res) {
    noteController.addNote(req, res);
});

router.post('/edit_note',[authenticateCustomer], [
    check('id', 'Please enter valid note id').isMongoId().notEmpty(),
    check('title', 'Please enter title').notEmpty(),
    check('note', 'Please enter note').notEmpty(),
 ], function (req, res) {
    noteController.editNote(req, res);
});

router.post('/clone_note',[authenticateCustomer], [
    check('title', 'Please enter title').notEmpty(),
    check('note', 'Please enter note').notEmpty(),
 ], function (req, res) {
    noteController.cloneNote(req, res);
});

router.get('/delete_note',[authenticateCustomer], [
    check('id', 'Please enter valid note id').isMongoId().notEmpty(),
 ], function (req, res) {
    noteController.deleteNote(req, res);
});

module.exports = router;
