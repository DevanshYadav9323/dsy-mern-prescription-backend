/**
 * Local playground server for testing the Textract Lambda handler.
 *
 * Usage:
 *   cd shopkya_backend/Shopkya_Textract && node playground.js
 *
 * To route traffic here, set in your backend .env:
 *   PREFILL_LAMBDA_URL=http://localhost:3456
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const { handler } = require("./index");

const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/", async (req, res) => {
    console.log("[playground] Received request");
    try {
        const event = { body: JSON.stringify(req.body) };
        const result = await handler(event);
        console.log("[playground] Handler finished:", result);
        res.status(200).json(result);
    } catch (err) {
        console.error("[playground] Handler error:", err);
        res.status(500).json({ error: true, message: err.message });
    }
});

const PORT = 3456;
app.listen(PORT, () => {
    console.log(`[playground] Lambda playground running on http://localhost:${PORT}`);
    console.log("[playground] POST / to invoke the handler");
});
