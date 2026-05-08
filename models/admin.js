var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    firstname:String,
    lastname:String,
    email:String,
    password:String,
    otp:Number
},
    {
        timestamps: true
    });

module.exports = mongoose.model('admin', schema);