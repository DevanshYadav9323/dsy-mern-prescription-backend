var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    question:String,
    answer:String
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('faq', schema);