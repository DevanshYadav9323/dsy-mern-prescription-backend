const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

const shopModel = require("../models/shop");
const settlementModel = require("../models/settlement");
const { sendWhatsappTemplate } = require("../lib/helper");

dayjs.extend(utc);
dayjs.extend(timezone);

// Gupshup template — daily per-shop settlement summary.
// Body: "Shopkya Redemption Summary: Hi! Here's your store's redemption summary for today ..."
// Variables: {{1}} store, {{2}} date, {{3}} total redeems, {{4}} reserved (empty),
//            {{5}} total coins, {{6}} total discount ₹
const SETTLEMENT_SUMMARY_TEMPLATE_ID = "c1eb5135-8a6d-45a9-bef1-a9cf1dc6f94a";

// 100 coins = ₹1 (kept consistent with redeemReq controller).
const COINS_PER_RUPEE = 100;

// Compute today's redeem totals for a single shop, scoped to the IST day.
const buildShopSummary = async (shopId) => {
    const todayIST = dayjs().tz("Asia/Kolkata");
    const startOfDay = todayIST.startOf("day").toDate();
    const endOfDay = todayIST.endOf("day").toDate();

    const settlements = await settlementModel.find({
        shop_id: shopId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const redeemCount = settlements.length;
    const totalCoins = settlements.reduce(
        (sum, s) => sum + (Number(s.coins) || 0),
        0
    );
    const totalDiscount = (totalCoins / COINS_PER_RUPEE).toFixed(2);

    return { redeemCount, totalCoins, totalDiscount };
};

// Send the daily summary WhatsApp message to one shop's WhatsApp-enabled phones.
const sendShopDailySummary = async (shop) => {
    const numbers = (shop.phone_numbers || []).filter(
        (p) => p && p.is_whatsapp && p.number
    );
    if (numbers.length === 0) return;

    const { redeemCount, totalCoins, totalDiscount } = await buildShopSummary(
        shop._id
    );

    if (!SETTLEMENT_SUMMARY_TEMPLATE_ID) return;

    const params = [
        shop.shop_name || "",
        dayjs().tz("Asia/Kolkata").format("DD-MM-YYYY"),
        String(redeemCount),
        " ", // {{4}} reserved — Gupshup tends to reject empty strings, so send a space.
        String(totalCoins),
        totalDiscount,
    ];

    for (const p of numbers) {
        await sendWhatsappTemplate(
            p.number,
            SETTLEMENT_SUMMARY_TEMPLATE_ID,
            params
        );
    }
};

// Main cron tick — runs every minute. Picks up shops scheduled for "now" (HH:mm IST)
// that haven't already been notified today, sends them the summary, and stamps the date.
const runSettlementSummaryTick = async () => {
    try {
        const now = dayjs().tz("Asia/Kolkata");
        const currentHHmm = now.format("HH:mm");
        const todayKey = now.format("YYYY-MM-DD");

        const shops = await shopModel.find({
            summary_time: currentHHmm,
            last_summary_sent_on: { $ne: todayKey },
        });

        if (shops.length === 0) return;

        for (const shop of shops) {
            try {
                await sendShopDailySummary(shop);
                await shopModel.updateOne(
                    { _id: shop._id },
                    { last_summary_sent_on: todayKey }
                );
            } catch (err) {
                console.log(
                    `Settlement summary failed for shop ${shop._id}:`,
                    err.message
                );
            }
        }
    } catch (err) {
        console.error("settlementSummaryCron tick error:", err);
    }
};

module.exports = {
    runSettlementSummaryTick,
};
