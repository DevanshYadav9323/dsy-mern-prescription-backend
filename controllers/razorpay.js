const Razorpay = require("razorpay");
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const shopModel = require("../models/shop");
const orderModel = require("../models/order");
const transactionsModel = require("../models/transaction");
const { sendEmail, sendPushNotification, sendMessage } = require("../lib/helper");

const createOrder = async (req, res) => {
  try {
    const { order_id } = req.body;

    const order = await orderModel.findById(new ObjectId(order_id));
    if (!order) {
      return res.status(200).json({
        error: true,
        message: "Please select valid order",
      });
    }
    const options = {
      amount: 100 * Number(order.amount || 0),
      currency: "INR",
      payment_capture: 1,
      notes: {
        order_id,
      },
    };
    const orderData = await razorpayInstance.orders.create(options);
    res.status(200).json({ message: "success", error: false, orderData });
  } catch (error) {
    console.log(error);
    res
      .status(200)
      .json({ message: error.message || "Something went wrong", error: true });
  }
};

const sendPayouts = async () => {
  try {
    const { _id } = req.user;
    const { rewards } = req.body;

    const customerData = await customerModel.findById(_id);
    if (rewards > customerData.total_reward) {
      res
        .status(200)
        .json({
          error: true,
          message: "Redeem amount should be lower than rewards available",
        });
    }
    if (customerData && customerData.razorpay_fund_ac_no) {
      try {
        const { data } = await axios.post(
          "https://api.razorpay.com/v1/payouts",
          {
            account_number: process.env.BANK_AC_NO,
            fund_account_id:
              customerData && customerData.razorpay_fund_ac_no
                ? customerData.razorpay_fund_ac_no
                : "",
            amount: rewards ? Number(rewards || 0) * 100 : 0,
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
            queue_if_low_balance: true,
            notes: {
              customer_id: _id,
            },
          },
          {
            auth: {
              username: process.env.RAZORPAY_KEY_ID,
              password: process.env.RAZORPAY_KEY_SECRET,
            },
          }
        );
        await transactionsModel.create({
          customer_id: data.payload.payout.entity.notes.customer_id,
          description: "Rewards redeem",
          amount: data.payload.payout.entity.amount
            ? Number(data.payload.payout.entity.amount) / 100
            : 0,
          date: new Date(),
          payout_id: data.payload.payout.entity.id,
          type: "payout",
        });
      } catch (error) {
        console.log("Payout creation error: ", error);
        console.log(
          error &&
            error.response &&
            error.response.data &&
            error.response.data.error
        );
      }
    }
  } catch (error) {
    console.log(error);
    console.log(
      error &&
        error.response &&
        error.response.data &&
        error.response.data.error
    );
  }
};

const webhook = async (req, res) => {
  const secret = "shopKya2024";
  const signature = req.get("x-razorpay-signature");
  try {
    const data = req.body;

    const isValid = Razorpay.validateWebhookSignature(
      JSON.stringify(data),
      signature,
      secret
    );
    if (!isValid) throw new Error("Signature verification failed!");
    else {
      switch (data.event) {
        case "order.paid":
          try {
            if (
              data.payload &&
              data.payload.order &&
              data.payload.order.entity &&
              data.payload.order.entity.notes &&
              data.payload.order.entity.notes.order_id
            ) {
              const orderData = await orderModel
                .findById(data.payload.order.entity.notes.order_id)
                .populate("customer_id");
              if (orderData) {
                await transactionsModel.create({
                  customer_id: orderData.customer_id._id,
                  description: `Payment success for order ${data.payload.order.entity.notes.order_id}`,
                  amount: data.payload.order.entity.amount_paid
                    ? Number(data.payload.order.entity.amount_paid) / 100
                    : 0,
                  date: new Date(),
                  status: "success",
                  payment_id: data.payload.payment.entity.id,
                  type: "order",
                });
                var mailData = {
                  email: orderData.customer_id.email,
                  templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                  dynamic_template_data: {
                    name: orderData.customer_id.name,
                    msg1: `Thank you for your payment. Your ShopKya order ${orderData.order_no} from ${orderData.shop} has been confirmed.`,
                    subject: `Order confirmed`,
                  },
                };
                // await sendEmail(mailData);
              }
              await orderModel.findByIdAndUpdate(
                data.payload.order.entity.notes.order_id,
                {
                  payment_status: "paid",
                  order_status: "confirmed",
                  razorpay_order_id: data.payload.order.entity.id,
                  payment_id: data.payload.payment.entity.id,
                  $push: { order_log: { status: "confirmed", updatedAt: new Date() }}
                }
              );
            }
          } catch (error) {
            console.log("order.paid error: ", error);
          }
          break;
        case "payment.failed":
          try {
            if (
              data.payload &&
              data.payload.payment &&
              data.payload.payment.entity &&
              data.payload.payment.entity.notes &&
              data.payload.payment.entity.notes.order_id
            ) {
              const orderData = await orderModel
                .findById(data.payload.payment.entity.notes.order_id)
                .populate("customer_id");
              if (orderData) {
                await transactionsModel.create({
                  customer_id: orderData.customer_id._id,
                  description: `Payment failed for order ${data.payload.order.entity.notes.order_id}`,
                  amount: data.payload.order.entity.amount_paid
                    ? Number(data.payload.order.entity.amount_paid) / 100
                    : 0,
                  date: new Date(),
                  status: "failed",
                  payment_id: data.payload.payment.entity.id,
                  type: "order",
                });
              }
              await orderModel.findByIdAndUpdate(
                data.payload.order.entity.notes.order_id,
                { payment_status: "failed" }
              );
            }
          } catch (error) {
            console.log("payment.failed error: ", error);
          }
          break;
        case "payout.processed":
          try {
            if (
              data.payload &&
              data.payload.payout &&
              data.payload.payout.entity &&
              data.payload.payout.entity.notes &&
              data.payload.payout.entity.notes.customer_id
            ) {
              const customer = await customerModel.findById(
                data.payload.payout.entity.notes.customer_id
              );
              
              
              if (customer) {
                await transactionsModel.create({
                  customer_id: data.payload.payout.entity.notes.customer_id,
                  description: "Rewards redeem success",
                  amount: data.payload.payout.entity.amount
                    ? Number(data.payload.payout.entity.amount) / 100
                    : 0,
                  date: new Date(),
                  payout_id: data.payload.payout.entity.id,
                  status:"success",
                  type: "payout",
                });

                await walletTransaction.create({
                  customer_id:data.payload.payout.entity.notes.customer_id,
                  rewards: data.payload.payout.entity.amount,
                  description:`payout processed from ${data.payload.payout.entity.notes.customer_id}`,
                  type:"debit"
                })

                var mailData = {
                  email: customer.email,
                  templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                  dynamic_template_data: {
                    name: order.customer_id.name,
                    msg1: `Payout successful!`,
                    subject: `Payout confirmed`,
                  },
                };
                // await sendEmail(mailData);
              }
            }
          } catch (error) {
            console.log("payout.processed error: ", error);
          }
          break;
        case "payout.reversed":
          try {
            if (
              data.payload &&
              data.payload.payout &&
              data.payload.payout.entity &&
              data.payload.payout.entity.notes &&
              data.payload.payout.entity.notes.customer_id
            ) {
              const customer = await customerModel.findById(
                data.payload.payout.entity.notes.customer_id
              );
              
              if (customer) {
                await transactionsModel.create({
                  customer_id: data.payload.payout.entity.notes.customer_id,
                  description: "Rewards redeem failed",
                  amount: data.payload.payout.entity.amount
                    ? Number(data.payload.payout.entity.amount) / 100
                    : 0,
                  date: new Date(),
                  payout_id: data.payload.payout.entity.id,
                  status:"success",
                  type: "payout",
                });
                
                await walletTransaction.create({
                  customer_id:data.payload.payout.entity.notes.customer_id,
                  rewards: data.payload.payout.entity.amount,
                  description:`payout reveresed to ${data.payload.payout.entity.notes.customer_id}`
                })

                var mailData = {
                  email: customer.email,
                  templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                  dynamic_template_data: {
                    name: customer.name,
                    msg1: `Payout failed!`,
                    subject: `Payout failed`,
                  },
                };
                // await sendEmail(mailData);
              }
            }
          } catch (error) {
            console.log("payout.reversed error: ", error);
          }
          break;
        case "payout.failed":
          try {
            if (
              data.payload &&
              data.payload.payout &&
              data.payload.payout.entity &&
              data.payload.payout.entity.notes &&
              data.payload.payout.entity.notes.customer_id
            ) {
              const customer = await customerModel.findById(
                data.payload.payout.entity.notes.customer_id
              );
              
              if (customer) {
                await transactionsModel.create({
                  customer_id: data.payload.payout.entity.notes.customer_id,
                  description: "Rewards redeem failed",
                  amount: data.payload.payout.entity.amount
                    ? Number(data.payload.payout.entity.amount) / 100
                    : 0,
                  date: new Date(),
                  payout_id: data.payload.payout.entity.id,
                  status:"success",
                  type: "payout",
                });

                await walletTransaction.create({
                  customer_id:data.payload.payout.entity.notes.customer_id,
                  rewards: data.payload.payout.entity.amount,
                  description:`payout reveresed to ${data.payload.payout.entity.notes.customer_id}`
                })

                var mailData = {
                  email: customer.email,
                  templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                  dynamic_template_data: {
                    name: customer.name,
                    msg1: `Payout failed!`,
                    subject: `Payout failed`,
                  },
                };
                // await sendEmail(mailData);
              }
            }
          } catch (error) {
            console.log("payout.failed error: ", error);
          }
          break;
        case "fund_account.validation.completed":
          try {
            if (
              data.payload &&
              data.payload["fund_account.validation"] &&
              data.payload["fund_account.validation"].entity
            ) {
              if (
                data.payload["fund_account.validation"].entity.fund_account
                  .bank_account &&
                data.payload["fund_account.validation"].entity.fund_account
                  .bank_account.account_number
              ) {
                const customer = await customerModel.findOneAndUpdate(
                  {
                    "bank.bank_ac_no":
                      data.payload["fund_account.validation"].entity
                        .fund_account.bank_account.account_number,
                  },
                  { bank_func_ac_status: "success" }
                );
                if (customer) {
                  if (
                    customer &&
                    customer.device_token &&
                    customer.device_token.length > 0
                  ) {
                    const title = "Bank Account Validation";
                    const body = String(customer._id);
                    const not_body = "Your bank account is now verified with us."
                    // for (const token of customer.device_token) {
                    //   await sendPushNotification(token, title, body, not_body);
                    // }
                  }
                  var mailData = {
                    email: customer.email,
                    templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                    dynamic_template_data: {
                      name: customer.name,
                      msg1: `This is to inform you that your bank account is now verified.`,
                      subject: `Bank Account Validation`,
                    },
                  };
                  // await sendEmail(mailData);
                  // sendMessage("This is to inform you that your bank account is now verified with ShopKya. -ShopKya",[customer.phone_no])
                }
              }
              if (
                data.payload["fund_account.validation"].entity.fund_account
                  .vpa &&
                data.payload["fund_account.validation"].entity.fund_account.vpa
                  .address
              ) {
                const customer = await customerModel.findOneAndUpdate(
                  {
                    upi: data.payload["fund_account.validation"].entity
                      .fund_account.vpa.address,
                  },
                  { bank_func_ac_status: "success" }
                );
                if (customer) {
                  if (
                    customer &&
                    customer.device_token &&
                    customer.device_token.length > 0
                  ) {
                    const title = "UPI Validation";
                    const body = String(customer._id);
                    const not_body = "Your UPI is now verified with us."
                    // for (const token of customer.device_token) {
                    //   await sendPushNotification(token, title, body, not_body);
                    // }
                  }
                  var mailData = {
                    email: customer.email,
                    templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                    dynamic_template_data: {
                      name: customer.name,
                      msg1: `This is to inform you that your UPI is now verified.`,
                      subject: `UPI Validation`,
                    },
                  };
                  // await sendEmail(mailData);
                  // sendMessage("This is to inform you that your UPI is now verified with ShopKya. -ShopKya",[customer.phone_no])
                }
              }
            }
          } catch (error) {
            console.log("fund_account.validation.completed error: ", error);
          }
          break;
        case "fund_account.validation.failed":
          try {
            if (
              data.payload &&
              data.payload["fund_account.validation"] &&
              data.payload["fund_account.validation"].entity
            ) {
              if (
                data.payload["fund_account.validation"].entity.fund_account
                  .bank_account &&
                data.payload["fund_account.validation"].entity.fund_account
                  .bank_account.account_number
              ) {
                const customer = await customerModel.findOneAndUpdate(
                  {
                    "bank.bank_ac_no":
                      data.payload["fund_account.validation"].entity
                        .fund_account.bank_account.account_number,
                  },
                  { bank_func_ac_status: "", "bank.banking_name":"","bank.bank_ac_no":"","bank.ifsc_code":"","bank.account_type":"","bank.bank_name":"","bank.bank_branch":"" }
                );
                if (customer) {
                  if (
                    customer &&
                    customer.device_token &&
                    customer.device_token.length > 0
                  ) {
                    const title = "Bank Account Validation";
                    const body = String(customer._id);
                    const not_body = "Your bank account verification has failed. Please try again."
                    // for (const token of customer.device_token) {
                    //   await sendPushNotification(token, title, body, not_body);
                    // }
                  }
                  var mailData = {
                    email: customer.email,
                    templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                    dynamic_template_data: {
                      name: customer.name,
                      msg1: `This is to inform you that your bank account verification has failed. Please try again.`,
                      subject: `Bank Account Validation`,
                    },
                  };
                  // await sendEmail(mailData);
                  // sendMessage("This is to inform you that your bank account verification has failed. Please try again. -ShopKya",[customer.phone_no])
                }
              }
              if (
                data.payload["fund_account.validation"].entity.fund_account
                  .vpa &&
                data.payload["fund_account.validation"].entity.fund_account.vpa
                  .address
              ) {
                const customer = await customerModel.findOneAndUpdate(
                  {
                    upi: data.payload["fund_account.validation"].entity
                      .fund_account.vpa.address,
                  },
                  { bank_func_ac_status: "",upi:"" }
                );
                if (customer) {
                  if (
                    customer &&
                    customer.device_token &&
                    customer.device_token.length > 0
                  ) {
                    const title = "UPI Validation";
                    const body = String(customer._id);
                    const not_body = "Your UPI verification has failed. Please try again."
                    // for (const token of customer.device_token) {
                    //   await sendPushNotification(token, title, body, not_body);
                    // }
                  }
                  var mailData = {
                    email: customer.email,
                    templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                    dynamic_template_data: {
                      name: customer.name,
                      msg1: `This is to inform you that your UPI verification has failed. Please try again.`,
                      subject: `Bank Account Validation`,
                    },
                  };
                  // await sendEmail(mailData);
                  // sendMessage("This is to inform you that your UPI verification has failed. Please try again. -ShopKya",[customer.phone_no])
                }
              }
            }
          } catch (error) {
            console.log("fund_account.validation.failed error: ", error);
          }
          break;
        case "refund.processed":
          try {
            if (
              data.payload &&
              data.payload.refund &&
              data.payload.refund.entity &&
              data.payload.refund.entity.notes &&
              data.payload.refund.entity.notes.order_id
            ) {
              const order = await orderModel.findById(
                data.payload.refund.entity.notes.order_id
              ).populate('customer_id');
              
              if (order) {
                await transactionsModel.create({
                  customer_id: order.customer_id._id,
                  description: `Refund success for order ${order._id}`,
                  amount: data.payload.refund.entity.amount
                    ? Number(data.payload.refund.entity.amount) / 100
                    : 0,
                  date: new Date(),
                  payment_id: data.payload.payment.entity.id,
                  status:"success",
                  type: "order",
                });

                var mailData = {
                  email: customer.customer_id.email,
                  templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                  dynamic_template_data: {
                    name: customer.name,
                    msg1: `This is to inform you that a refund of Rs. ${Number(data.payload.refund.entity.amount) / 100} for your ShopKya order #SKO03230001 from ${order.shop} has been processed. You shall receive the money in your bank account within 12 working days.`,
                    subject: `Refund sucessfull`,
                  },
                };
                // await sendEmail(mailData);
              }
            }
          } catch (error) {
            console.log("refund.processed.failed error: ", error);
          }
        case "refund.failed":
          try {
            if (
              data.payload &&
              data.payload.refund &&
              data.payload.refund.entity &&
              data.payload.refund.entity.notes &&
              data.payload.refund.entity.notes.order_id
            ) {
              const order = await orderModel.findById(
                data.payload.refund.entity.notes.order_id
              ).populate('customer_id');
              
              if (order) {
                await transactionsModel.create({
                  customer_id: order.customer_id._id,
                  description: `Refund failed for order ${order._id}`,
                  amount: data.payload.refund.entity.amount
                    ? Number(data.payload.refund.entity.amount) / 100
                    : 0,
                  date: new Date(),
                  payment_id: data.payload.payment.entity.id,
                  status:"failed",
                  type: "order",
                });

                // var mailData = {
                //   email: customer.email,
                //   templateId: "d-1f06b17e0bfb44a385747657b883e05a",
                //   dynamic_template_data: {
                //     name: customer.name,
                //     msg1: `Refund failed!`,
                //     subject: `Refund failed`,
                //   },
                // };
                // await sendEmail(mailData);
              }
            }
          } catch (error) {
            console.log("refund.failed error: ", error);
          }
        default:
          console.log("Unhandled event: ", data.event);
      }
      res.status(200).end();
    }
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
};

module.exports = {
  createOrder,
  sendPayouts,
  webhook,
};
