var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    type:String,
    reward:Number
},
    {
        timestamps: true
    });

module.exports = mongoose.model('systemConfig', schema);