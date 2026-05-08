var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    customer_id:{
        type:Schema.Types.ObjectId,
        ref:'customer'
    },
    title:String,
    note:String
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('note', schema);