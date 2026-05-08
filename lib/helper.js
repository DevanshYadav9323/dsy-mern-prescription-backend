const dayjs = require("dayjs");
var isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);
require("dotenv").config();
const AWS = require("aws-sdk");
const ID = process.env.AWS_ACCESS_KEY;
const SECRET = process.env.AWS_SECRET_KEY;
const Customer = require("../models/customer");
const Products = require("../models/product");
const Alias = require("../models/alias");
const { Buffer } = require("buffer");
const { jsPDF } = require("jspdf");
require("jspdf-autotable");
const sdk = require("api")("@gupshup/v1.0#ezpvi10lcyl9hs6");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const GUPSHUP_API_KEY = process.env.GUPSHUP_API_KEY;
// const productsModel = require("../models/product")
AWS.config.update({
    accessKeyId: ID,
    secretAccessKey: SECRET,
    region: "ap-south-1",
});
const s3Bucket = new AWS.S3({
    params: { Bucket: process.env.AWS_BUCKET_NAME },
});
const s3BaseUrl = `https://s3.ap-south-1.amazonaws.com/${process.env.AWS_BUCKET_NAME}/`;
const chars = {
    "#": "%23",
    $: "%24",
    "&": "%26",
    "+": "%2B",
    ":": "%3A",
    ";": "%3B",
    "=": "%3D",
    "?": "%3F",
    "@": "%40",
    "[": "%5B",
    "]": "%5D",
    "%": "%25",
    "^": "%5E",
    "{": "%7B",
    "}": "%7D",
    "|": "%7C",
    "\\": "%5C",
    '"': "%22",
    "<": "%3C",
    ",": "%2C",
    ">": "%3E",
    "`": "%60",
};
const admin = require("firebase-admin");
const customerServiceAccount = require("./shopkya-a88a2-firebase-adminsdk-gkz9z-9666e125ba.json");
const customerApp = admin.initializeApp({
    credential: admin.credential.cert(customerServiceAccount),
});

const sgMail = require("@sendgrid/mail");
const { default: axios } = require("axios");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { encode } = require("urlencode");
const orderModel = require("../models/order");
const shop = require("../models/shop");
// const dummyProd = require("../models/dummyProd");
const bcrypt = require("bcryptjs");

const sendMobileOtp = (phone_no) => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
};

const sendMailOtp = (email) => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp;
};

const sendReferralCode = () => {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;

    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * charactersLength);
        result += characters.charAt(randomIndex);
    }

    return result;
};

const generateOrderNumber = (lastOrder) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    if (!lastOrder) {
        return `SKO${month}${year}0001`;
    }
    if (
        lastOrder &&
        lastOrder.createdAt &&
        dayjs(lastOrder.createdAt).month() == month - 1 &&
        dayjs(lastOrder.createdAt).year() == year
    ) {
        const numberOfOrder = Number(lastOrder.order_no.slice(-4)) + 1;
        let formattedNumber = String(numberOfOrder).padStart(4, "0");
        return `SKO${month}${year}${formattedNumber}`;
    } else {
        return `SKO${month}${year}0001`;
    }
};

const generateRedeemReqNumber = (lastRedeem) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    if (!lastRedeem) {
        return `SKR${month}${year}0001`;
    }

    if (
        dayjs(lastRedeem.createdAt).month() === month - 1 &&
        dayjs(lastRedeem.createdAt).year() === year
    ) {
        const number = Number(lastRedeem.redeem_req_no.slice(-4)) + 1;
        const formatted = String(number).padStart(4, "0");
        return `SKR${month}${year}${formatted}`;
    }

    return `SKR${month}${year}0001`;
};

const generateScanOrderNumber = (lastScan) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    if (!lastScan) {
        return `SKS${month}${year}0001`;
    }
    if (
        lastScan &&
        lastScan.createdAt &&
        dayjs(lastScan.createdAt).month() == month - 1 &&
        dayjs(lastScan.createdAt).year() == year
    ) {
        const numberOfOrder = Number(lastScan.scan_no.slice(-4)) + 1;
        let formattedNumber = String(numberOfOrder).padStart(4, "0");
        return `SKS${month}${year}${formattedNumber}`;
    } else {
        return `SKS${month}${year}0001`;
    }
};

const base64Upload = (path, name, type, base64Str) => {
    var filename = path + "/" + name;
    const fileBuffer = Buffer.from(
        base64Str.replace(/.*base64,/, ""),
        "base64"
    );
    var data = {
        Key: filename,
        Body: fileBuffer,
        ContentEncoding: "base64",
        ContentType: type,
    };
    return new Promise((resolve, reject) => {
        s3Bucket.putObject(data, function (err) {
            if (err) {
                console.log("File upload err", err);
                return reject(err);
            }
            console.log("File uploaded ", name);
            resolve(
                s3BaseUrl +
                filename.replace(/[@#$%^&+={[}\]|\\:;"<,>?`]/g, (m) => chars[m])
            );
        });
    });
};

const sendPushNotification = async (token, title, body, not_body) => {
    try {
        const message = {
            data: {
                title,
                body,
            },
            notification: {
                title,
                body: not_body || "",
            },
            token,
        };
        await customerApp.messaging().send(message);
        console.log("Notification sent");
        return;
    } catch (error) {
        console.error("Error sending notification:", error);
    }
};

const sendEmail = async (data) => {
    try {
        let mailOptions = {
            to: data.email,
            from: "shopkya.a@gmail.com",
            subject: data.subject,
        };
        if (data.templateId) {
            mailOptions.templateId = data.templateId;
            mailOptions.dynamic_template_data = data.dynamic_template_data;
        } else {
            mailOptions.html = data.body;
        }

        if (data.attachments) {
            mailOptions.attachments = data.attachments;
        }

        if (data.cc && data.cc.length > 0) {
            mailOptions.cc = data.cc;
        }

        if (data.bcc && data.bcc.length > 0) {
            mailOptions.bcc = data.bcc;
        }
        // else {
        //     mailOptions.bcc = "developer@infiny.in"
        // }
        sgMail
            .send(mailOptions)
            .then(() => {
                console.log("Email sent");
            })
            .catch((error) => {
                console.error("sending email error", JSON.stringify(error));
            });
        return;
    } catch (error) {
        console.log("Email Error", error);
        return error;
    }
};

async function uploadImageFromUrl(url, path, name, type) {
    const filename = path + "/" + name;

    const response = await axios({
        method: "get",
        url: url,
        responseType: "arraybuffer",
    });
    const fileBuffer = Buffer.from(response.data, "binary");
    const data = {
        Key: filename,
        Body: fileBuffer,
        ContentType: type,
        ACL: "public-read",
    };

    await new Promise((resolve, reject) => {
        s3Bucket.putObject(data, (err) => {
            if (err) {
                console.log("File upload error:", err);
                return reject(err);
            }
            console.log("File uploaded:", name);
            resolve();
        });
    });

    return (
        s3BaseUrl +
        filename.replace(/[@#$%^&+={[}\]|\\:;"<,>?`]/g, (m) => chars[m])
    );
}

function generatePdfFromHtml(data) {
    const doc = new jsPDF();
    let headers = ["Sr no", "Product", "Weight", "Quantity"];
    doc.setFontSize(10);
    doc.text(`${data.shop_name}\n${data.shop_address}`, 195, 30, {
        align: "right",
        lineHeightFactor: 1.5,
    });
    doc.setFontSize(20);
    doc.text("Order Details", 15, 50);
    doc.setFontSize(10);
    doc.text(
        `Order no: ${data.order_no}\nName: ${data.name}\nAddress: ${data.address}`,
        15,
        60,
        { lineHeightFactor: 1.5 }
    );
    doc.text(
        `Phone no: ${data.phone_no}\nSlot: ${dayjs(data.start_time).format(
            "DD-MM-YYYY hh a"
        )} - ${dayjs(data.end_time).format("hh a")}`,
        115,
        60,
        { lineHeightFactor: 1.5 }
    );

    doc.autoTable({
        theme: "grid",
        headStyles: {
            fillColor: ["#000"],
        },
        head: [headers],
        body: data.products,
        margin: { top: 80 },
    });
    const arrayBuffer = doc.output("arraybuffer");
    uploadFileToS3(arrayBuffer, data);
}

function uploadFileToS3(arrayBuffer, orderData) {
    const fileBuffer = Buffer.from(arrayBuffer, "binary");

    const data = {
        Key: `orders/${orderData.order_no}.pdf`,
        Body: fileBuffer,
        ContentType: "application/pdf",
        ACL: "public-read", // Set object ACL to public-read
    };
    const url = s3BaseUrl + "orders/" + orderData.order_no + ".pdf";

    s3Bucket.putObject(data, function (err, data) {
        if (err) {
            console.log("File upload err", err);
        } else {
            console.log("File uploaded ", orderData.order_no + ".pdf");
        }
    });
    sendWhatsappMessage(url, orderData);
}

// Generic Gupshup template sender. Errors are caught and logged so callers
// can fire-and-forget without crashing the request flow.
async function sendWhatsappTemplate(phone, templateId, params = [], messageOverride = null) {
    if (!phone || !templateId) return null;
    try {
        const cleanPhone = String(phone).replace(/\D/g, "");
        const destination = cleanPhone.length === 10 ? "91" + cleanPhone : cleanPhone;
        const body = {
            source: 918928663254,
            destination,
            template: JSON.stringify({ id: templateId, params }),
        };
        if (messageOverride) {
            body.message = JSON.stringify(messageOverride);
        }
        const { data } = await axios.post(
            "https://api.gupshup.io/wa/api/v1/template/msg",
            body,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    apikey: GUPSHUP_API_KEY,
                },
            }
        );
        return data;
    } catch (err) {
        console.log(
            `sendWhatsappTemplate failed for ${phone}:`,
            err?.response?.data || err.message
        );
        return null;
    }
}

async function sendWhatsappMessage(url, orderData) {
    const shopData = await shop.findById(orderData.shop_id);

    let text = dayjs(orderData.start_time).format("dddd, MMMM D, YYYY hh A");
    // let msg ={content:{type:"file",url:url,text: text,filename: `${orderData.order_no}.pdf`,caption:"Thank you"},type:"quick_reply",msgid:"qr1",options:[{type:"text",title:"Confirm"},{type:"text",title:"Modify"}]}
    // sdk.postMsg({
    //     message: JSON.stringify(msg),
    //     channel: 'whatsapp',
    //     source: 918591612489,
    //     destination: "91"+`${shopData.phone_no}`,
    //     src: {
    //         name:'ShopKya'
    //     }
    //   }, {
    //     apikey: GUPSHUP_API_KEY
    //   })
    //     .then(async ({ data }) => {console.log("message sent"); await orderModel.findOneAndUpdate({order_no:orderData.order_no},{msg_id:JSON.parse(data).messageId})})
    //     .catch(err => console.error(err));
    try {
        const { data } = await axios.post(
            "https://api.gupshup.io/wa/api/v1/template/msg",
            {
                source: 918928663254,
                destination: "91" + `${shopData.phone_no}`,
                template: JSON.stringify({
                    id: "bab9e71e-ed06-4c10-9671-57ff8e0408b0",
                    params: [orderData.order_no, text],
                }),
                message: JSON.stringify({
                    type: "document",
                    document: { link: url, filename: orderData.order_no },
                }),
            },
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    apikey: GUPSHUP_API_KEY,
                },
            }
        );
        await orderModel.findOneAndUpdate(
            { order_no: orderData.order_no },
            { msg_id: data.messageId }
        );
    } catch (err) {
        console.log(err);
    }
}

// const sendMessage = async (msg, numbers) => {
//     try {
//         const url = `https://api.textlocal.in/send?apikey=${
//             process.env.SMS_API_KEY
//         }&numbers=${numbers.join(",")}&sender=${encode(
//             "SHPKYA"
//         )}&message=${encodeURIComponent(msg)}`;
//         const { data } = await axios.get(url);
//         console.log(data.status);
//         if (data.status == "failure")
//             throw new Error(JSON.stringify(data.errors));
//     } catch (error) {
//         console.log(error);
//     }
// };


const sendMessage = async (msg, numbers, otp) => {
    try {
      const response = await axios.post(
        "https://control.msg91.com/api/v5/flow/",
        {
          flow_id: process.env.MSG91_FLOW_ID, // your flow/template ID
          sender: "SHPKYA",
          mobiles: numbers.map(num => `91${num}`).join(","), // assuming Indian numbers
          var1: otp, // this matches your variable name in MSG91 template
        },
        {
          headers: {
            authkey: process.env.MSG91_AUTH_KEY,
            "Content-Type": "application/json",
          },
        }
      );
  
      console.log("MSG91 response:", response.data);
      if (response.data.type !== "success") {
        throw new Error("MSG91 SMS sending failed");
      }
    } catch (error) {
      console.error("SMS Error:", error.response?.data || error.message);
    }
  };

const insertAlias = async ({ product_name, product_id, alias }) => {
    
    if (!alias || alias.trim() === "") return;

    try {
        const v = await Alias.findOne({ product_id, alias: alias.trim() });
        console.log("v : " , v);

        await Alias.updateOne(
            { product_id, alias: alias.trim() }, 
            { $setOnInsert: { product_name, product_id, alias: alias.trim() } }, 
            { upsert: true } 
        );

    } catch (err) {
        if (err.code !== 11000) {
            console.error("Error inserting alias:", err);
        }
    }
  };

// const updateUrlInDb = async () => {
//     try{
//         console.log("IN")
//         const products = await productsModel.find()
//         for(let product of products){
//             let url = `https://shopkya-data.s3.ap-south-1.amazonaws.com/products/${product.SKU}.png`
//             try{
//                 await axios.get(url)
//                 await productsModel.findByIdAndUpdate(product._id,{product_image:url})
//             } catch (error){
//                console.log("first")
//             }

//         }
//         console.log("DONE")
//     } catch(error) {
//         console.log(error)
//     }
// }

// const updateDescInDB = async () => {
//     try{
//         console.log("IN")

//         const products = await dummyProd.find()
//         for(let product of products){
//             await productsModel.findOneAndUpdate({SKU:product.SKU},{product_desc:product.product_desc})
//         }
//         console.log("DONE")
//     } catch(error) {
//         console.log(error)
//     }
// }

async function hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    return hashedPassword;
}

async function migrateNames() {
    try {
      const customers = await Customer.find({ name: { $exists: true, $ne: "" } });
  
      console.log(`Found ${customers.length} documents with "name"`);
  
      for (let cust of customers) {
        if (!cust.name || typeof cust.name !== "string") {
          console.log(`Skipping ${cust._id}, name not a string`);
          continue;
        }
  
        // Clean up and split
        const parts = cust.name
          .replace(/,/g, " ")
          .trim()
          .split(/\s+/)
          .filter(Boolean);
  
        let firstName = "";
        let lastName = "";
  
        if (parts.length === 1) {
          firstName = parts[0];
        } else if (parts.length > 1) {
          firstName = parts[0];
          lastName = parts[parts.length - 1];
        }
        console.log(firstName, lastName, "newww")
        cust.first_name = firstName;
        cust.last_name = lastName;
  
        await cust.save();
        console.log(`Updated ${cust._id}: ${firstName} ${lastName}`);
      }
  
      console.log("✅ Migration finished");
      process.exit(0);
    } catch (err) {
      console.error("❌ Migration error:", err);
      process.exit(1);
    }
  }
  
//   migrateNames();


async function migrateShopLocations() {
    try {
      const shops = await shop.find({
        latitude: { $exists: true, $ne: "" },
        longitude: { $exists: true, $ne: "" }
      });
  
      console.log(`Found ${shops.length} shops with latitude/longitude`);
  
      for (let shop of shops) {
        const lat = parseFloat(shop.latitude);
        const lng = parseFloat(shop.longitude);
  
        if (isNaN(lat) || isNaN(lng)) {
          console.log(`Skipping ${shop._id}, invalid lat/lng`);
          continue;
        }
  
        console.log(`Updating ${shop._id} → [${lng}, ${lat}]`);
  
        shop.location = {
          type: "Point",
          coordinates: [lng, lat]
        };
  
        await shop.save();
      }
  
      console.log("✅ Shop location migration completed");
      process.exit(0);
    } catch (err) {
      console.error("❌ Migration error:", err);
      process.exit(1);
    }
  }
  
// migrateShopLocations();

const migratePhoneNumbers = async () => {
  try {
    const shops = await shop.find({
      phone_no: { $exists: true, $ne: null },
      $or: [
        { phone_numbers: { $exists: false } },
        { phone_numbers: { $size: 0 } }
      ]
    });

    console.log(`Found ${shops.length} shops to migrate`);

    for (let s of shops) {
      const phone = String(s.phone_no || "").replace(/\D/g, "");

      if (!phone) continue;

      console.log("Migrating:", s._id, s.phone_no);

      await shop.updateOne(
        { _id: s._id },
        {
          $set: {
            phone_numbers: [{ number: phone, is_whatsapp: false }]
          }
        }
      );
    }

    console.log("Migration completed ✅");
  } catch (err) {
    console.error(err);
  }
};

// migratePhoneNumbers()


// function parseExpenseDocument(doc) {
//   const result = {};

//   console.log("Doc.SummaryFields : " , doc.SummaryFields);

//   for (const field of doc.SummaryFields || []) {
//     const rawKey =
//       (field.Type && field.Type.Text) ||
//       (field.LabelDetection && field.LabelDetection.Text) ||
//       null;

//     const rawVal = field.ValueDetection?.Text ?? null;
//     if (!rawKey) continue;

//     result[rawKey.trim()] = rawVal?.trim() || "";
//   }

//   return result;
// }

function parseExpenseDocument(doc) {
  const result = {};

  console.log("Doc.SummaryFields : ", doc.SummaryFields);

  // Small helper: clean up label text like "ITEM(S) :" -> "ITEM(S)"
  const normalizeLabel = (label) => {
    if (!label) return null;
    return String(label)
      .replace(/\s*[:：]\s*$/g, "") // remove trailing colon(s) + spaces
      .trim();
  };

  for (const field of doc?.SummaryFields || []) {
    const typeKey = field.Type?.Text?.trim() || null;               // e.g. "TOTAL", "SUBTOTAL", "OTHER"
    const labelKeyRaw = field.LabelDetection?.Text || null;         // e.g. "ITEM(S) :", "FSSAI NO"
    const labelKey = normalizeLabel(labelKeyRaw);                   // e.g. "ITEM(S)", "FSSAI NO"
    const rawVal = field.ValueDetection?.Text?.trim() ?? "";

    if (!rawVal) continue;

    // 1) Preserve original Type-based keys (INVOICE_RECEIPT_DATE, TOTAL, SUBTOTAL, VENDOR_NAME, etc.)
    if (typeKey) {
      // Don't overwrite if same key already exists
      if (result[typeKey] == null) {
        result[typeKey] = rawVal;
      }
    }

    // 2) ALSO expose label-based keys for fields with labels
    //    This is where "ITEM(S)" / "TIME" / "FSSAI NO" etc. will show up.
    if (labelKey) {
      if (result[labelKey] == null) {
        result[labelKey] = rawVal;
      }
    }
  }

  return result;
}


function parseLineItems(doc) {
    const allRows = [];
    if (!Array.isArray(doc.LineItemGroups)) return allRows;
  
    for (const group of doc.LineItemGroups) {
      if (!Array.isArray(group.LineItems)) continue;
  
      for (const line of group.LineItems) {
        const rowData = {};
  
        for (const field of (line.LineItemExpenseFields || [])) {
          const rawKey =
            (field.Type?.Text?.trim()) ||
            (field.LabelDetection?.Text?.trim()) ||
            null;
          const rawVal = field.ValueDetection?.Text?.trim() ?? null;
          if (rawKey) rowData[rawKey] = rawVal || "";
        }
  
        if (Object.keys(rowData).length > 0) {
          // Normalize key variants (Textract may output "PRICE" or "UNIT PRICE")
          rowData.PRICE =
            rowData.PRICE ||
            rowData["UNIT PRICE"] ||
            rowData["RATE"] ||
            rowData["UNIT_PRICE"] ||
            "";
  
          rowData.QUANTITY =
            rowData.QUANTITY ||
            rowData.QTY ||
            rowData["QTY."] ||
            "";
  
          rowData.TOTAL =
            rowData.TOTAL ||
            rowData.AMOUNT ||
            rowData["TOTAL PRICE"] ||
            rowData["ITEM TOTAL"] ||
            "";
  
            rowData.MRP =
  rowData.MRP ||
  rowData["M.R.P"] ||
  rowData["MRP"] ||
  rowData["RATE"] ||
  "";

  // ---- DERIVE MRP FROM EXPENSE_ROW IF NOT PRESENT ----
// if (!rowData.MRP && rowData.EXPENSE_ROW) {
//   const numbers = [];
// const regex = /(\d+(?:\.\d+)?)(?!\s*(?:GM|G|KG|ML|L|PCS))/gi;

// let match;
// while ((match = regex.exec(rowData.EXPENSE_ROW)) !== null) {
//   numbers.push(Number(match[1]));
// }


//   /*
//     Example:
//     "ITEM 1 500.0 310.00 310.00"
//     → [1, 500, 310, 310]
//   */

//   if (numbers.length >= 3) {
//     const qty = parseFloat(rowData.QUANTITY);
// const priceCandidates = numbers.filter(n => !qty || n !== qty);

// if (priceCandidates.length >= 2) {
//   const unitPrice = priceCandidates[priceCandidates.length - 2];
//   const mrpCandidate = Math.max(...priceCandidates);

//   if (mrpCandidate >= unitPrice) {
//     rowData.MRP = String(mrpCandidate);
//   }
// }

// if (rowData.MRP && rowData.PRICE) {
//   const mrp = Number(rowData.MRP);
//   const selling = Number(rowData.PRICE);

//   if (mrp < selling || mrp > selling * 3) {
//     rowData.MRP = "";
//   }
// }


//   }
// }

if (!rowData.MRP && rowData.EXPENSE_ROW) {
  const numbers = [];
  const regex = /(\d+(?:\.\d+)?)(?!\s*(?:GM|G|KG|ML|L|PCS))/gi;

  let match;
  while ((match = regex.exec(rowData.EXPENSE_ROW)) !== null) {
    numbers.push(Number(match[1]));
  }

  if (numbers.length >= 2) {
    const qty = parseFloat(rowData.QUANTITY) || 1;
    const unitPrice = parseFloat(rowData.PRICE) || 0;

    // Remove quantity itself from numbers
    let candidates = numbers.filter(n => n !== qty);

    // Remove unit_price and totals (approximate)
    candidates = candidates.filter(n => n !== unitPrice && n !== unitPrice * qty);

    // Now pick the largest remaining number as MRP
    const mrpCandidate = Math.max(...candidates, 0);

    if (mrpCandidate >= unitPrice && mrpCandidate <= unitPrice * qty * 3) {
      // sanity check: mrp >= unit price, but not absurd
      rowData.MRP = String(mrpCandidate);
    }
  }
}

          allRows.push(rowData);
        }
      }
    }
  
    return allRows;
  }


async function inferItemCountFromTextract(headers, lineItems) {
    const payload = {
        headers,
        // keep lineItems only as a hint, but tell the model not to rely on its length
        lineItems: lineItems?.map(li => ({
            ITEM: li.ITEM,
            QUANTITY: li.QUANTITY,
            OTHER: li.OTHER,
            PRICE: li.PRICE,
            UNIT_PRICE: li.UNIT_PRICE,
            TOTAL: li.TOTAL,
            EXPENSE_ROW: li.EXPENSE_ROW,
        })) || [],
    };

    const systemPrompt = `
You are a strict invoice parser.

You receive:
- headers: key/value pairs from AWS Textract SummaryFields (includes things like TOTAL, SUBTOTAL, ITEM(S), TOTAL LINES, /QTY, etc.).
- lineItems: per-row text from the invoice (may be incomplete; some rows may be missing).

Your job: infer the **total number of items** on the bill.

Important rules:

1. Do **NOT** use lineItems.length as the count; lineItems may be incomplete.
   You may only use lineItems as hints (e.g. to understand how the merchant prints counts), not to directly count items.
2. Prefer fields that clearly indicate item count or total quantity:
   - Keys containing: "ITEM", "ITEM(S)", "ITEMS", "QTY", "/QTY", "QUANTITY", "TOTAL LINES", "NO OF ITEMS", etc.
3. Distinguish money vs count:
   - SUBTOTAL, TOTAL, AMOUNT, CASH, TAX, etc are almost always **money**.
   - Item count is usually a **small integer** (e.g. 1–100).
   - Values like "470.00" may be money; values like "2", "4", "11.000" are likely counts.
   - If value looks like "11.000", treat as 11.
   - If value looks like "10Pp" etc, extract the numeric part (10).
4. If multiple candidates exist:
   - Prefer the one whose key most clearly refers to item count, e.g. "ITEM(S)" or "TOTAL ITEM(S)" or "/QTY".
   - If nothing like that exists but "TOTAL LINES" exists and is a small integer, you may use "TOTAL LINES".
5. If you **cannot confidently** identify an item count field, return null.

Output a compact JSON object only, with:
{
  "item_count": number | null,
  "confidence": number,   // 0 to 1
  "source_key": string | null,  // the header key you used, e.g. "ITEM(S)" or "TOTAL LINES"
  "raw_value": string | null    // original string value from that header
}
`;

    const completion = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: systemPrompt },
            {
                role: "user",
                content:
                    "Infer the total item count for this bill using the rules. Here is the data:\n\n" +
                    JSON.stringify(payload, null, 2),
            },
        ],
    });

    const json = JSON.parse(completion.choices[0].message.content);

    // Normalize and sanity-check
    let itemCount = null;
    if (typeof json.item_count === "number" && Number.isFinite(json.item_count)) {
        itemCount = Math.round(json.item_count); // force integer
    }

    return {
        itemCount,
        confidence: typeof json.confidence === "number" ? json.confidence : 0,
        sourceKey: json.source_key || null,
        rawValue: json.raw_value || null,
    };
}

const cleanAmount = (v) =>
    Number(
        String(v ?? "0")
            .replace(/[₹Rs\s]/gi, "")
            .replace(/,/g, "")
    ) || 0;

    function cleanQuantity(q) {
        if (!q) return 1;
        return (
            Number(
                String(q)
                    .replace(/[^0-9.]/g, "")
                    .trim()
            ) || 1
        );
    }    

function extractMoneyCandidates(headers) {
    const candidates = [];
  
    for (const [key, value] of Object.entries(headers || {})) {
      const amount = cleanAmount(value);
      if (!amount || amount <= 0) continue;
  
      candidates.push({
        key,
        raw_value: value,
        amount,
      });
    }
  
    return candidates;
  }

  
  async function inferNetBillAmount(headers) {
    const candidates = extractMoneyCandidates(headers);
  
    if (candidates.length === 0) {
      return { amount: null, confidence: 0 };
    }
  
    const systemPrompt = `
  You are an invoice payment analyzer.
  
  Your task:
  Identify the FINAL PAYABLE / NET BILL AMOUNT that a customer must pay.
  
  Rules:
  1. Prefer fields whose key or meaning implies final payment:
     - TOTAL
     - GRAND TOTAL
     - NET AMOUNT
     - AMOUNT PAYABLE
     - BILL AMOUNT
  2. SUBTOTAL is NOT final if taxes/roundoff exist.
  3. If multiple totals exist:
     - Choose the largest reasonable value.
  4. Ignore:
     - TAX breakup
     - CGST / SGST individually
     - DISCOUNT alone
  5. Output null if unsure.
  
  Output JSON only:
  {
    "amount": number | null,
    "confidence": number,
    "source_key": string | null,
    "raw_value": string | null
  }
  `;
  
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify(candidates, null, 2),
        },
      ],
    });
  
    return JSON.parse(completion.choices[0].message.content);
  }
  
  


async function seedAliasesFromProducts () {
    const products = await Products.find({}, { _id: 1, product_name: 1 });
  
    let count = 0;
  
    for (const p of products) {
      try {
        await Alias.updateOne(
          { product_id: p._id, alias: p.product_name }, // unique constraint here
          {
            product_id: p._id,
            product_name: p.product_name,
            alias: p.product_name
          },
          { upsert: true }
        );
        count++;
      } catch (e) {
        console.log("skip duplicate/err:", p._id, e.message);
      }
    }
  
    console.log("✅ seeded aliases:", count);
}

// (async () => {
//     await seedAliasesFromProducts();
//     process.exit(0);
//   })();


const updateProductPriceLearning = async (orderDetails) => {
    for (const item of orderDetails) {

        // if (!item.product_id || !item.selling_price || !item.count) continue;
        if (!item.product_id || !item.ocr_mrp) continue;

        // const unitSellingPrice = Number(
        //     (item.selling_price / item.count).toFixed(2)
        // );

        const unit_OCR_MRP =  Number(item.ocr_mrp.toFixed(2));

        const product = await Products.findById(item.product_id);

        if (!product || !product.price) continue;

        // If same as current product price → skip
        if (unit_OCR_MRP === product.price) {
            continue;
        }

        // Case 1: updated_price is empty
        if (!product.updated_price) {

            product.updated_price = unit_OCR_MRP;
            product.price_counter = 1;
        }
        // Case 2: same as updated_price → increment counter
        else if (unit_OCR_MRP === product.updated_price) {
            product.price_counter += 1;
        }
        // Case 3: different price → reset tracking
        else {
            product.updated_price = unit_OCR_MRP;
            product.price_counter = 1;
        }

        // If counter hits 10 → commit price
        if (product.price_counter >= 10) {
            product.price = product.updated_price;
            product.price_counter = 0;
            // optional cleanup
            // product.updated_price = null;
        }
        await product.save();
    }    
};



module.exports = {
    sendMobileOtp,
    generateOrderNumber,
    sendMailOtp,
    base64Upload,
    generateScanOrderNumber,
    sendPushNotification,
    sendEmail,
    uploadImageFromUrl,
    generatePdfFromHtml,
    uploadFileToS3,
    sendWhatsappMessage,
    sendWhatsappTemplate,
    sendMessage,
    insertAlias,
    sendReferralCode,
    hashPassword,
    generateScanOrderNumber,
    generateRedeemReqNumber,
    parseExpenseDocument,
    parseLineItems,
    cleanAmount,
    cleanQuantity,
    inferItemCountFromTextract,
    inferNetBillAmount,
    // updateUrlInDb,
    // updateDescInDB,
    updateProductPriceLearning,
};
