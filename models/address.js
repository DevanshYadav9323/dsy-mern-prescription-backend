var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    title:String,
    flat:String,
    area:String,
    customer_id:{
        type:Schema.Types.ObjectId,
        ref:'customer'
    },
    latitude: String,
    longitude: String,
    farAway: Boolean
},
    {
        timestamps: true
    });

module.exports = mongoose.model('address', schema);