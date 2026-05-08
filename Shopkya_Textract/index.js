const mongoose = require("mongoose");
const AWS = require("aws-sdk");

// ===== MODELS =====
const orderModel = require("./models/order");
const shopModel = require("./models/shop");
const productModel = require("./models/product");
const aliasModel = require("./models/alias");

// ===== HELPERS =====
const {
    cleanAmount,
    cleanQuantity,
    parseDMY,
    parseExpenseDocument,
    parseLineItems,
    inferItemCountFromTextract,
    extractKeyFromS3Url,
} = require("./lib/helper");

let env;
let textract;
let BUCKET;

const OpenAI = require("openai");

// ===== DB CONNECTION (Lambda-safe) =====
let isConnected = false;
async function connectDB(MONGO_URI) {
    if (isConnected) return;
    await mongoose.connect(MONGO_URI, {
        maxPoolSize: 5,
    });
    isConnected = true;
}

async function extractBillsCore(bills) {
    const openai = new OpenAI({
        apiKey: env.OPENAI_API_KEY,
    });
    const results = [];

    for (const url of bills) {
        try {
            const key = extractKeyFromS3Url(url);

            if (!key) {
                results.push({
                    source_url: url,
                    error: true,
                    message: "Invalid S3 URL — unable to extract file path.",
                });
                continue;
            }

            const params = {
                Document: {
                    S3Object: {
                        // Bucket: "infiny-staging",
                        // Name: "image(1).jpg",
                        // Bucket: "shopkya-data",
                        Bucket: BUCKET,
                        Name: key,
                        // Name: "scans/684681a04faf7a16e1552fce/Laxman_Shinde_bill_blurred.jpeg",
                    },
                },
            };

            const textractResponse = await textract
                .analyzeExpense(params)
                .promise();

            const doc = textractResponse.ExpenseDocuments?.[0];

            const headers = await parseExpenseDocument(doc);
            const lineItems = await parseLineItems(doc);

            console.log("\n===== [TEXTRACT] Normalized Output =====");
            console.log("[TEXTRACT] Headers:", JSON.stringify(headers, null, 2));
            console.log("[TEXTRACT] Line Items:", JSON.stringify(lineItems, null, 2));
            console.log("========================================\n");

            let itemCountInfo = null;
            try {
                itemCountInfo = await inferItemCountFromTextract(headers, env.OPENAI_API_KEY);
            } catch (e) {
                console.error("[TEXTRACT] Failed to infer item count:", e.message);
            }

            // ---- fuzzy shop (same as your code)
            let matchedShop = null;
            const searchTerm =
                headers?.VENDOR_NAME?.trim() ||
                headers?.NAME?.trim() ||
                headers?.VENDOR_ADDRESS?.split("\n")[0]?.trim();

            if (searchTerm) {
                const searchResult = await shopModel.aggregate([
                    {
                        $search: {
                            index: "default",
                            text: {
                                query: searchTerm,
                                path: ["shop_name"],
                                fuzzy: { maxEdits: 2, prefixLength: 2 },
                            },
                        },
                    },
                    { $limit: 1 },
                    {
                        $project: {
                            _id: 1,
                            shop_name: 1,
                            phone_no: 1,
                            city: 1,
                            score: { $meta: "searchScore" },
                        },
                    },
                ]);
                if (searchResult.length > 0) matchedShop = searchResult[0];
            }

            const enrichedLineItems = [];

            // Step 1: Run all Atlas Search queries in parallel
            const searchResults = await Promise.all(
                lineItems.map(async (item) => {
                    const productName = item.ITEM?.trim();
                    if (!productName) return { item, candidates: [] };
                    const matchedAliasAgg = await aliasModel.aggregate([
                        {
                            $search: {
                                index: "default",
                                compound: {
                                    must: [
                                        {
                                            text: {
                                                query: productName,
                                                path: "alias",
                                                fuzzy: { maxEdits: 2, prefixLength: 2 },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 0,
                                product_id: 1,
                                product_name: 1,
                                createdAt: 1,
                                match_score: { $meta: "searchScore" },
                            },
                        },
                        { $sort: { match_score: -1 } },
                        { $limit: 3 },
                    ]);
                    return { item, candidates: matchedAliasAgg };
                })
            );

            // Step 2: Single OpenAI call for all items that have candidates
            const itemsWithCandidates = searchResults
                .map((r, idx) => ({ ...r, idx }))
                .filter(r => r.candidates.length > 0);

            const openAIMatchMap = {}; // idx -> matching_names[]

            if (itemsWithCandidates.length > 0) {
                const batchInput = itemsWithCandidates.map(({ idx, item, candidates }) => ({
                    index: idx,
                    item: item.ITEM?.trim(),
                    candidates: candidates.map(c => c.product_name),
                }));

                console.log("\n===== [ATLAS] Fuzzy Search → OpenAI Input =====");
                console.log(JSON.stringify(batchInput, null, 2));
                console.log("================================================\n");

                try {
                    const response = await openai.chat.completions.create({
                        model: "gpt-4o",
                        temperature: 0,
                        response_format: { type: "json_object" },
                        messages: [
                            {
                                role: "system",
                                content: `You are a product matching assistant.
For each item in the input array, select candidates that match in meaning, quantity, and unit.
Return a JSON object with key "matches": an array of { "index": number, "matching_names": string[] }.
You MUST always return at least one candidate in matching_names — pick the closest match even if it is not a perfect match. Only ignore case differences.`,
                            },
                            {
                                role: "user",
                                content: JSON.stringify(batchInput),
                            },
                        ],
                    });

                    const parsed = JSON.parse(response.choices[0].message.content);

                    console.log("\n===== [OPENAI] Match Output =====");
                    console.log(JSON.stringify(parsed, null, 2));
                    console.log("=================================\n");

                    for (const m of (parsed.matches || [])) {
                        openAIMatchMap[m.index] = m.matching_names || [];
                    }
                } catch (err) {
                    console.error("[OPENAI] Batch matching error:", err.message);
                }
            }

            // Step 3: Collect all matched product IDs → one batch DB query
            const allProductIds = new Set();
            for (const { idx, candidates } of itemsWithCandidates) {
                for (const name of (openAIMatchMap[idx] || [])) {
                    const aliasDoc = candidates.find(c => c.product_name === name);
                    if (aliasDoc?.product_id) allProductIds.add(String(aliasDoc.product_id));
                }
            }

            const productDocs = await productModel.find(
                { _id: { $in: Array.from(allProductIds) } },
                { SKU: 1, company_id: 1, category_id: 1, unit: 1, product_image: 1, price: 1 }
            );
            const productMap = {};
            for (const p of productDocs) productMap[String(p._id)] = p;

            // Step 4: Build enrichedLineItems using prefetched data
            for (const { item, candidates, idx } of searchResults.map((r, i) => ({ ...r, idx: i }))) {
                let matchedProduct = null;

                if (candidates.length > 0) {
                    const matchingNames = openAIMatchMap[idx] || [];
                    if (matchingNames.length > 0) {
                        let maxSku = -Infinity;
                        for (const name of matchingNames) {
                            const aliasDoc = candidates.find(c => c.product_name === name);
                            if (!aliasDoc) continue;
                            const productDoc = productMap[String(aliasDoc.product_id)];
                            if (productDoc && productDoc.SKU > maxSku) {
                                maxSku = productDoc.SKU;
                                matchedProduct = {
                                    id: aliasDoc.product_id,
                                    name: aliasDoc.product_name,
                                    brand: productDoc.company_id || null,
                                    product_image: productDoc.product_image || null,
                                    unit: productDoc.unit,
                                    mrp: productDoc.price || null,
                                    category: productDoc.category_id || null,
                                    match_score: aliasDoc.match_score,
                                    SKU: productDoc.SKU || null,
                                };
                            }
                        }
                    }
                }

                enrichedLineItems.push({
                    ...item,
                    matched_product: matchedProduct || null,
                });
            }

            results.push({
                source_url: url,
                header_data: {
                    ...headers,
                    matched_shop: matchedShop
                        ? {
                            id: matchedShop._id,
                            name: matchedShop.shop_name,
                            phone: matchedShop.phone_no,
                            city: matchedShop.city,
                            match_score: matchedShop.score,
                        }
                        : null,

                    item_count: itemCountInfo?.itemCount ?? null,
                    item_count_confidence: itemCountInfo?.confidence ?? 0,
                    item_count_source_key: itemCountInfo?.sourceKey ?? null,
                },
                line_items: enrichedLineItems,
            });

        } catch (err) {
            results.push({
                source_url: url,
                error: true,
                message: `Textract failed: ${err.message}`,
            });
        }
    }

    return results;
}

async function prefillAndSaveOrder(orderDoc, customerId) {
    const bills = orderDoc.bills || [];
    if (!Array.isArray(bills) || bills.length === 0) return;

    const results = await extractBillsCore(bills);

    // pick first with a shop for assignment
    const firstWithShop = results.find((r) => r?.header_data?.matched_shop);
    const shopName = firstWithShop?.header_data?.matched_shop?.name || null;

    // invoice fields from first available header
    const invoiceNo = results
        .map(
            (r) =>
                r?.header_data?.INVOICE_NO ||
                r?.header_data?.INVOICE_NUMBER ||
                r?.header_data?.INVOICE_RECEIPT_ID
        )
        .find(Boolean);
    const invoiceDateStr = results
        .map((r) => r?.header_data?.INVOICE_RECEIPT_DATE)
        .find(Boolean);
    const invoiceDate = parseDMY(invoiceDateStr);

    const itemCountInfo =
        results
            .map((r) => ({
                itemCount: r?.header_data?.item_count,
                confidence: r?.header_data?.item_count_confidence ?? 0,
            }))
            .sort((a, b) => b.confidence - a.confidence)[0];

    const itemCount =
        itemCountInfo && itemCountInfo.confidence > 0.6
            ? itemCountInfo.itemCount
            : null;

    const totalAmount =
        results
            .map((r) => cleanAmount(r?.header_data?.SUBTOTAL))
            .find((v) => v > 0) || 0;
    const totalSellingPrice =
        results
            .map((r) => cleanAmount(r?.header_data?.SUBTOTAL))
            .find((v) => v > 0) || 0;

    // flatten line items
    const flat = results.flatMap((r) => r?.line_items || []);

    // build order_details; add alias to product.aliases if matched
    const order_details = [];
    for (const it of flat) {
        const alias = it.ITEM || null;
        // const qty = Number(it.QUANTITY) || 1;
        const qty = cleanQuantity(it.QUANTITY);
        const unit = it.UNIT || undefined;
        const mp = it.matched_product;

        const selling_price =
            cleanAmount(it.PRICE) ||
            cleanAmount(it.SUBTOTAL) / (Number(it.QUANTITY) || 1) ||
            0;

        const ocr_mrp =
            cleanAmount(it.MRP) || null;

        order_details.push({
            company_id: mp?.brand,
            product_id: mp?.id,
            product_name: mp?.name,
            product_image: mp?.product_image,
            unit: mp?.unit,
            mrp: mp?.mrp,
            ocr_mrp: ocr_mrp,
            count: qty,
            quantity: qty,
            rewards: 0,
            alias,
            selling_price,
        });

        if (mp?.id && alias) {
            await aliasModel.updateOne(
                { product_id: mp.id, alias: alias },
                { product_id: mp.id, product_name: mp.name, alias: alias },
                { upsert: true }
            );
        }
    }

    // === Deduplicate final order_details based on product_id — skip duplicates ===
    const uniqueOrderDetails = [];
    const seen = new Set();

    for (const od of order_details) {
        const pid = od.product_id;

        if (!pid) {
            // No product match — always keep
            uniqueOrderDetails.push(od);
            continue;
        }

        if (!seen.has(String(pid))) {
            seen.add(String(pid));
            uniqueOrderDetails.push(od);
        }
    }

    // ensure shop exists if recognized
    let update = {
        // order_details,
        order_details: uniqueOrderDetails,
        total_amount: totalAmount || 0,
        total_selling_price: totalSellingPrice || 0,
        total_lines: itemCount || 0,
    };
    if (invoiceNo) update.invoice_no = invoiceNo;
    if (invoiceDate) update.invoice_date = invoiceDate;

    if (shopName) {
        let partnerShop = await shopModel.findOne({ shop_name: shopName });
        if (!partnerShop)
            partnerShop = await shopModel.create({
                shop_name: shopName,
                is_dark: true,
            });
        update.shop = partnerShop.shop_name;
        update.shop_id = partnerShop._id;
    }

    // Only prefill if still in 'placed' (avoid overwriting admin edits)
    await orderModel.updateOne(
        { _id: orderDoc._id, order_status: "placed" },
        { $set: update }
    );
}

// =====================================================
// ================= LAMBDA HANDLER ====================
// =====================================================

exports.handler = async (event) => {
    const data = JSON.parse(event.body);
    env = data.env;

    AWS.config.update({
        accessKeyId: env.AWS_ACCESS_KEY,
        secretAccessKey: env.AWS_SECRET_KEY,
        region: env.AWS_REGION,
    });

    textract = new AWS.Textract({
        region: env.AWS_REGION,
        accessKeyId: env.TEXTRACT_AWS_ACCESS_KEY,
        secretAccessKey: env.TEXTRACT_AWS_SECRET_KEY,
    });

    BUCKET = env.BUCKET;

    await connectDB(env.MONGO_URI);

    const { order, customer_id } = data;

    if (!order || !Array.isArray(order.bills)) {
        throw new Error("Invalid payload");
    }

    // await prefillAndSaveOrder(order, customer_id);

    try {
        await prefillAndSaveOrder(order, customer_id);
        await orderModel.updateOne(
            { _id: order._id },
            { $set: { textract_status: "processed" } }
        );
    } catch (err) {
        await orderModel.updateOne(
            { _id: order._id },
            { $set: { textract_status: "failed" } }
        );
        throw err;  // rethrow to Lambda log
    }


    return { success: true };
};
