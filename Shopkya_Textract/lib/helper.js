const dayjs = require("dayjs");
const isBetween = require("dayjs/plugin/isBetween");
dayjs.extend(isBetween);

const OpenAI = require("openai");


function parseExpenseDocument(doc) {
  const result = {};

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


async function inferItemCountFromTextract(headers, OPENAI_API_KEY) {
  const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
  });

  const systemPrompt = `
You are a strict invoice header analyzer.

You will receive only invoice header key/value pairs extracted from OCR.

Your job is to identify which header key most likely represents 
the total number of lines/items in the bill.

Important rules:

1. Look for keys that clearly indicate line count or item count such as:
   - TOTAL LINES
   - NO OF LINES
   - NO OF ITEMS
   - ITEM(S)
   - ITEMS
   - QTY
   - QUANTITY
   - LINES

2. The value must represent a count:
   - Usually a small integer (1–200)

3. Ignore money fields:
   - TOTAL
   - SUBTOTAL
   - TAX
   - AMOUNT
   - CASH
   - GRAND TOTAL

4. If multiple candidate keys exist:
   - Choose the most clearly related to item/line count.

5. If you cannot confidently determine a field, return null.

Return only compact JSON:

{
  "item_count": number | null,
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
        content:
          "Identify which header represents number of lines/items from this data:\n\n" +
          JSON.stringify(headers, null, 2),
      },
    ],
  });

  const json = JSON.parse(completion.choices[0].message.content);

  // Normalize result
  let itemCount = null;

  if (typeof json.item_count === "number" && Number.isFinite(json.item_count)) {
    itemCount = Math.round(json.item_count);
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

const parseDMY = (s) => {
  if (!s) return undefined;

  const m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2}|\d{4})$/.exec(
    String(s).trim()
  );
  if (!m) return undefined;

  let [, d, mo, yRaw] = m;
  d = Number(d);
  mo = Number(mo);

  // Convert 2-digit year to 2000-based
  let y = Number(yRaw);
  if (y < 100) y += 2000;

  const dt = new Date(y, mo - 1, d);
  return Number.isFinite(dt.getTime()) ? dt : undefined;
};

const extractKeyFromS3Url = (url) => {
  try {
    const parsed = new URL(url);
    // pathname → "/shopkya-data/scans/...jpeg"
    const parts = parsed.pathname.split("/").filter(Boolean);

    // first segment = bucket
    parts.shift(); // remove "shopkya-data"

    // remaining parts = key
    return parts.join("/");
  } catch (err) {
    return null;
  }
};



module.exports = {
  parseExpenseDocument,
  parseLineItems,
  inferItemCountFromTextract,
  cleanAmount,
  cleanQuantity,
  parseDMY,
  extractKeyFromS3Url,
};
