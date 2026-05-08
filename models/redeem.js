var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    customer_id:{
        type:Schema.Types.ObjectId, 
        ref:'customer'
    },
    offer_id:[{
        type:Schema.Types.ObjectId,
        ref:'offer'
    }],
    order_id:{
        type:Schema.Types.ObjectId,
        ref:'order'
    }
},
    {
        timestamps: true
    });

module.exports = mongoose.model('redeem', schema);