var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    product_name:{
        type:String,
    },
    product_image:String,
    product_desc:String,
    subcategory:String,
    quantity:Number,
    unit:String,
    price:Number,
    updated_price: {
        type: Number,
        default: null
    },
    price_counter: {
        type: Number,
        default: 0
    },    
    variant:Number,
    SKU:String,
    company_id:{
        type:Schema.Types.ObjectId,
        ref:'company'
    },
    category_id:{
        type:Schema.Types.ObjectId,
        ref:'category'
    },
    is_deleted:{
        type:Boolean,
        default:false
    },
    is_hidden:{
        type:Boolean,
        default:false
    }
},
    {
        timestamps: true
    });

module.exports = mongoose.model('product', schema);