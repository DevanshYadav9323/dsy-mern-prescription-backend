const mongoose = require("mongoose");

const labelSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        order: Number,
        is_featured: Boolean,
        is_shop: Boolean,
    },
    { timestamps: true }
);

module.exports = mongoose.model("label", labelSchema);
