var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    customer_id:{
        type:Schema.Types.ObjectId,
        ref:'customer'
    },
    description:String,
    status: {
        type: String,
        default: 'pending',
        enum: ['pending','success', 'failed']
    },
    payment_id: String,
    date: Date,
    amount: Number,
    payout_id: String,
    type: {
        type: String,
        default: 'order',
        enum: ['order', 'payout']
    },
},
    {
        timestamps: true
    });

module.exports = mongoose.model('transaction', schema);