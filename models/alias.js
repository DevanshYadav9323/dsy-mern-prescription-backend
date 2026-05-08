var mongoose = require('mongoose');
var Schema = mongoose.Schema;

const aliasSchema = new Schema({
  product_name: { type: String, required: true },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: "products", required: true },
  alias: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('alias',aliasSchema);
