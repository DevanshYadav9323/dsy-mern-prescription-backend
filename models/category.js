var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
   category:String,
   category_image:String
},
    {
        timestamps: true
    });

module.exports = mongoose.model('category', schema);