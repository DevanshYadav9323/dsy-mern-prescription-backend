const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderRewardBreakdownSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'order', required: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'customer', required: true },
  shop_id: {
    type: Schema.Types.ObjectId,
    ref: 'shop'
  },
  amount_spent: { type: Number, required: true },
  offers: [
    {
      offer_id: { type: Schema.Types.ObjectId, ref: 'offer' },
      company_id: { type: Schema.Types.ObjectId, ref: 'company' },
      product_id: { type: Schema.Types.ObjectId, ref: 'product' },
      reward: { type: Number, required: true }
    }
  ],
  order_rewards: {
    shop_reward: { type: Number, default: 0 },
    milestone_reward: { type: Number, default: 0 },
    scan_reward: { type: Number, default: 0 }
  },
  milestone_hits: [   
    {
      milestone_id: { type: Schema.Types.ObjectId },
      amount: { type: Number },
      reward: { type: Number }
    }
  ],
  shop_hits: [
    {
      amount: { type: Number },
      reward: { type: Number }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('order_reward_breakdown', orderRewardBreakdownSchema);
