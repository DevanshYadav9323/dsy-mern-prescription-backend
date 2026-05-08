const mongoose = require('mongoose');
const Schema = mongoose.Schema;
 
const settlementGroupSchema = new Schema({
  shop_id: { type: Schema.Types.ObjectId, ref: 'shop' },
  settled_on: Date,
  total_coins: Number,
  total_amount: Number,
  redeems: [
    {
      customer_id: { type: Schema.Types.ObjectId, ref: 'customer' },
      redeem_id: { type: Schema.Types.ObjectId, ref: 'redeemReq' },
    }
  ],
}, {
  timestamps: true
});
 
module.exports = mongoose.model('group_settlement', settlementGroupSchema)