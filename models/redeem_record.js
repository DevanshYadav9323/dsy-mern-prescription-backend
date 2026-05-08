var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var redemptionSchema = new Schema({
    customer_id: { type: Schema.Types.ObjectId, ref: 'customer' },
    offer_id: { type: Schema.Types.ObjectId, ref: 'offer' },
    redeemed_at: { type: Date, default: Date.now },
    quantity: { type: Number, default: 1 }
  }, {
    timestamps: true
  });
  
  module.exports = mongoose.model('redeem_record', redemptionSchema);
  