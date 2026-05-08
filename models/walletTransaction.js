var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    customer_id:{
        type:Schema.Types.ObjectId,
        ref:'customer'
    },
    rewards:Number,
    type: {
        type: String,
        default: 'credit',
        enum: ['credit', 'debit']
    },
    description:String
},
    {
        timestamps: true
    });

module.exports = mongoose.model('walletTransaction', schema);