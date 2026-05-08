const cron = require("node-cron");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const broadcastModel = require("../models/broadcast");
const customerModel = require("../models/customer");
const { sendPushNotification } = require("../lib/helper");

dayjs.extend(utc);
dayjs.extend(timezone);

// ─── Reusable push sender ───────────────────────────────────────────────
const sendBroadcastToCustomers = async (broadcast) => {
  const customers = await customerModel.find({
    _id: { $in: broadcast.target },
  });

  const pushPromises = [];

  for (const customer of customers) {
    if (customer?.device_token?.length > 0) {
      for (const token of customer.device_token) {
        pushPromises.push(
          sendPushNotification(token, broadcast.title, "", broadcast.message)
        );
      }
    }
  }

  await Promise.all(pushPromises);

  broadcast.status = "sent";
  broadcast.sent_at = new Date();
  await broadcast.save();
};

// ─── Called by cron for scheduled broadcasts (12:30 PM / 06:30 PM) ─────
const sendScheduledBroadcasts = async (timeSlot) => {
  try {
    // Use IST timezone so startOfDay/endOfDay are correct
    const todayIST = dayjs().tz("Asia/Kolkata");
    const startOfDay = todayIST.startOf("day").toDate();
    const endOfDay = todayIST.endOf("day").toDate();

    console.log(`Querying for timeSlot: ${timeSlot}`);
    console.log(`Date range: ${startOfDay} → ${endOfDay}`);

    const broadcasts = await broadcastModel.find({
      status: "scheduled",
      broadcast_time: timeSlot,
      broadcast_date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (broadcasts.length === 0) {
      console.log("No Broadcasts Scheduled");
      return;
    }

    for (const broadcast of broadcasts) {
      await sendBroadcastToCustomers(broadcast);
      console.log(`Broadcast sent: ${broadcast.title}`);
    }
  } catch (error) {
    console.error("Broadcast cron error:", error);
  }
};

// ─── Called immediately when send_now = true ────────────────────────────
const sendImmediateBroadcast = async (broadcastId) => {
  try {
    const broadcast = await broadcastModel.findById(broadcastId);

    if (!broadcast) {
      console.error("Broadcast not found:", broadcastId);
      return;
    }

    await sendBroadcastToCustomers(broadcast);
    console.log(`Immediate broadcast sent: ${broadcast.title}`);
  } catch (error) {
    console.error("Immediate broadcast error:", error);
  }
};

module.exports = {
  sendScheduledBroadcasts,
  sendImmediateBroadcast,
};