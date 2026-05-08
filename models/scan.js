var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    customer_id:{
        type:Schema.Types.ObjectId,
        ref:'customer'
    },
    scan_no:{
        type:String,
        unique:true
    },
    shop:String,
    bills:[String],
    order_details:[{
        company_id:{
            type:Schema.Types.ObjectId,
            ref:'customer'
        },
        product_id:{
            type:Schema.Types.ObjectId,
            ref:'customer'
        },
        quantity:Number,
        cost:Number
    }],
    order_created: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    });

module.exports = mongoose.model('scan', schema);