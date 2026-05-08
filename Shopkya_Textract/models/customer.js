var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    phone_no: {
        type: String,
        unique: true
    },
    email: String,
    profile_pic: String,
    first_name: String,
    last_name: String,
    name: String,
    otp: Number,
    is_first_time: {
        type: Boolean,
        default: true
    },
    device_token: [String],
    referred_by:{type:Schema.Types.ObjectId, ref:"customer"},
    referral_code:String,
    rewards:Number,
    dob:Date,
    gender:String,
    upi:String,
    referral_qr:String,
    redeem_requested:{
        type: Boolean,
        default: false
    },
    is_disabled:{
        type: Boolean,
        default: false
    }, 
    spent_amount:[{shop_id:{type:Schema.Types.ObjectId, ref:"shop"},amount:Number, month:String , year: String}] 
},
    {
        timestamps: true
    });

module.exports = mongoose.model('customer', schema);