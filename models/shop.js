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

    shop_description: { type: String },            
    milestone_description: { type: String },  

    rewards:[{amount:Number,reward:Number}],
    milestone_rewards:[{amount:Number,reward:Number}],
    phone_no:String,
    phone_numbers: [
        {
          number: String,
          is_whatsapp: { type: Boolean, default: false },
          is_login: { type: Boolean, default: false },
        }
    ],
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

    new_user_rewards: [
        {
            scans: Number,
            reward: Number,
        }
    ],

    // Daily settlement-summary WhatsApp. summary_time is "HH:mm" in IST.
    // last_summary_sent_on is "YYYY-MM-DD" (IST), used to ensure once-per-day delivery.
    summary_time: { type: String, default: "" },
    last_summary_sent_on: { type: String, default: "" },
},
    {
        timestamps: true
    });

module.exports = mongoose.model('shop', schema);