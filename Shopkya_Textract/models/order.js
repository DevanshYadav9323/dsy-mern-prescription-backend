var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    order_no: {
        type: String,
        unique: true
    },
    order_status: String,
    textract_status: {
        type: String,
        enum: ["processing", "processed", "failed"],
        default: "processing"
    },
    //    reward:Number,
    //    cost:Number,
    is_offline: {
        type: Boolean,
        default: false
    },
    order_details: [{
        company_id: {
            type: Schema.Types.ObjectId,
            ref: 'company'
        },
        product_id: {
            type: Schema.Types.ObjectId,
            ref: 'product'
        },
        product_name: String,
        product_image: String,
        unit: String,
        count: Number,
        quantity: Number,
        rewards: Number,
        alias:String,
        selling_price: Number,
        mrp: Number,
        ocr_mrp: Number
    }],
    total_cost: Number,
    slot: { start_time: Date, end_time: Date },
    address_id: {
        type: Schema.Types.ObjectId,
        ref: 'address'
    },
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: 'shop'
    },
    shop: String,
    customer_id: {
        type: Schema.Types.ObjectId,
        ref: 'customer'
    },
    order_log: [{
        status: String,
        updatedAt: Date
    }],
    total_reward: Number,
    offers: [{
        type: Schema.Types.ObjectId,
        ref: 'offer'
    }],
    scan_id: {
        type: Schema.Types.ObjectId,
        ref: 'scan'
    },
    msg_id: String,
    //    payment_status:{
    //     type: String,
    //     enum: ['pending','paid','failed']
    //    },
    //    payment_id: String,
    //    razorpay_order_id: String,
    total_amount: Number,
    total_selling_price: Number,
    total_lines: Number,
    is_modify: {
        type: Boolean,
        default: false,
    },
    bills: [String],
    reason: String,
    seen: {
        type: Schema.Types.Boolean,
        default: false
    },
    invoice_no:String,
    invoice_date:Date
},
    {
        timestamps: true
    });

module.exports = mongoose.model('order', schema);