var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    redeem_id:{
        type:Schema.Types.ObjectId, 
        ref:'redeem'
    },
    customer_id:{
        type:Schema.Types.ObjectId, 
        ref:'customer'
    },
    coins:Number,
    status:{
        type:String,
        default:"pending",
        enum:["pending","settled"]
    },
    shop_id:{
        type:Schema.Types.ObjectId, 
        ref:'shop'
    },
    settled_on:Date
},
    {
        timestamps: true
    });

module.exports = mongoose.model('settlement', schema);