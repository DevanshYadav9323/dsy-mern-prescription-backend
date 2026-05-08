const mongoose = require("mongoose")

const broadcastSchema = new mongoose.Schema(
   {
     title: { type: String, required: true },
     message: { type: String, required: true },
     broadcast_date: {
      type: Date,
      required: false,
      default: null,
    },
     broadcast_time: {
      type: String,
     required: false,
      default: null,
   enum: ["12:30 PM", "06:30 PM", null],
    },
    status: {
      type: String,
      enum: ["scheduled", "pending", "sent"],
      default: "scheduled",
    },
    sent_at: {
      type: Date,
    },    
    is_scheduled: {        
      type: Boolean,
      default: true,
    },
    send_now: {             
      type: Boolean,
      default: false,
    },
     target: [{ type: mongoose.Schema.Types.ObjectId, ref: "customer" }], 
     shop: { type: String }, 
     brand: { type: mongoose.Schema.Types.ObjectId, ref: "company" }, 
     category: { type: mongoose.Schema.Types.ObjectId, ref: "category" }, 
     product: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
   },
   { timestamps: true }
 );

module.exports = mongoose.model('broadcast',broadcastSchema);