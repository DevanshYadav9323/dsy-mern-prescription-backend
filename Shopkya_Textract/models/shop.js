var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    shop_name:String,
    street:String,
    zip_code:Number,
    city:String,
    state:String,
    shop_rating:Number,
    shop_logo:String,
    rewards:[{amount:Number,reward:Number}],
    milestone_rewards:[{amount:Number,reward:Number}],
    phone_no:String,
    latitude:String,
    longitude:String,
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: {
          type: [Number],
          default: [0, 0]
        }
    },
    otp:Number,
    qrUrl:String,
    is_dark: { type: Boolean, default: false },
},
    {
        timestamps: true
    });

module.exports = mongoose.model('shop', schema);