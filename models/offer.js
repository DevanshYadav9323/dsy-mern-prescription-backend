var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    company_id: {
        type: Schema.Types.ObjectId,
        ref: 'company'
    },
    offer_title: String,
    is_featured: Boolean,
    offer_start: Date,
    offer_expiry: Date,
    redeem_limit: Number,
    product_details: [{
        product_id: {
            type: Schema.Types.ObjectId,
            ref: 'product'
        },
        product_name: String,
        product_image: String,
        reward: Number,
        quantity: Number,
        unit: String,
        price: Number,
    }],
    offer_description: String,
    offer_banner: String,
    is_hidden: {
        type: Boolean,
        default: false
    },
    offer_display: String,
    offer_type: String,
    order: Number,
    banner_order: {
        type: Number,
        default: 0
    },    
    subcategory: String,
    category_id: {
        type: Schema.Types.ObjectId,
        ref: 'category'
    },
    label_id: {
        type: Schema.Types.ObjectId,
        ref: 'label'
    },
    shop_id: [{
        type: Schema.Types.ObjectId,
        ref: 'shop'
    }],
    // unit_percentage: [{
    //     unit: { type: String },
    //     percentage: { type: Number }
    // }]
    unit_percentage: [{
        unit: { type: String },
        start: { type: Number },
        end: { type: Number },
        percentage: { type: Number }
    }]
},
    {
        timestamps: true
    });

module.exports = mongoose.model('offer', schema);