var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var schema = new Schema(
    {
        customer_id: {
            type: Schema.Types.ObjectId,
            ref: "customer",
        },
        coins: Number,
        status: {
            type: String,
            default: "requested",
            enum: ["requested", "fulfilled"],
        },
        shop_id: {
            type: Schema.Types.ObjectId,
            ref: "shop",
        },
        seen: {
            type: Schema.Types.Boolean,
            default: false,
        },
        redeem_req_no: {
            type: String,
            unique: true, 
        },
        upi: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("redeemReq", schema);
