var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    units:[String]
},
    {
        timestamps: true
    });

module.exports = mongoose.model('unit', schema);