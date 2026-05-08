var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    products:[{
        company_id:{
            type:Schema.Types.ObjectId,
            ref:'company'
        },
        product_id:{
            type:Schema.Types.ObjectId,
            ref:'product'
        },
        quantity:Number,
        count:Number,
        product_name:String,
        product_image:String,
        reward:Number,
        unit:String,
        price:Number
    }],
    shop_id:{
        type:Schema.Types.ObjectId,
        ref:'shop'
    },
    customer_id:{
        type:Schema.Types.ObjectId,
        ref:'customer'
    }
},
    {
        timestamps: true
    });

module.exports = mongoose.model('cart', schema);