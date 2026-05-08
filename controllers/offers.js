const { validationResult } = require("express-validator");
const offerModel = require("../models/offer");
const productModel = require('../models/product')
const companyModel = require('../models/company');
const redeemModel = require('../models/redeem');
const redeemRecordModel = require('../models/redeem_record');
const customerModel = require('../models/customer');
const labelModel = require('../models/label');
const favouriteOfferModel = require('../models/favouriteOffer');
const { base64Upload } = require("../lib/helper");
const { default: mongoose } = require("mongoose");
const favouriteOffer = require("../models/favouriteOffer");
const shop = require("../models/shop");
const categoryModel = require("../models/category");
const axios = require("axios");
const ObjectId = mongoose.Types.ObjectId;

const offersListing = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const offerData = await offerModel.find({ offer_start: { $lte: new Date() }, offer_expiry: { $gte: new Date() }, is_hidden: false }).populate('company_id', ['company_name', 'company_logo']).
            populate('product_details.product_id', ['is_hidden', 'is_deleted']).populate('label_id', ['title']).populate('shop_id', 'shop_name shop_logo').sort({ order: 1 })
        return res.json({ message: 'Successfully fetched data', error: false, offerData })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const offerRedeemStatus = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        
        const { offer_id } = req.query;
        const { _id }= req.user;

        if(!offer_id){
            return res.status(200).json({ error: true, message: "offer_id is required" });
          }

        const offer = await offerModel.findById(offer_id).populate('shop_id', 'shop_name shop_logo');

        if (!offer) {
            return res.status(404).json({ error: true, message: 'Offer not found' });
        }

        const redeemsDone = await redeemRecordModel.countDocuments({
            offer_id: offer_id,
            customer_id: _id
          });
      
          res.json({
            message: 'Successfully fetched data',
            error: false,
            offer: offer,
            redeem_limit: offer.redeem_limit,
            redeems_done: redeemsDone,
            redeems_left: offer.redeem_limit - redeemsDone
          });


    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

// const offersListingAdmin = async (req, res) => {
//     try {
//         const result = validationResult(req);
//         if (result.errors.length > 0) {
//             return res.status(200).json({
//                 error: true,
//                 title: result.errors[0].msg,
//                 errors: result,
//             });
//         }
//         const { brand_id, search, tab } = req.query
//         let query = {}
//         if (tab == 0) {
//             query = { offer_expiry: { $gte: new Date() }, is_hidden: false }
//         } else if (tab == 1) {
//             query = { offer_expiry: { $lt: new Date() }, is_hidden: false }
//         } else {
//             query = { is_hidden: true }
//         }
//         if (brand_id) {
//             const offerData = await offerModel.find({ company_id: brand_id, ...query }).populate("label_id", ["title"]).sort({ order: 1 })
//             const companyData = await companyModel.find({}).sort({ company_name: 1 })
//             const productData = await productModel.find({ is_hidden: false, is_deleted: false }).populate("category_id", ["category"]);
//             return res.status(200).json({ message: 'Successfully fetched data', error: false, offerData, companyData, productData })
//         } else if (search) {
//             var regex = new RegExp(search, "i");
//             const offerData = await offerModel.find({ offer_description: regex, ...query }).populate("label_id", ["title"]).sort({ order: 1 })
//             const companyData = await companyModel.find({}).sort({ company_name: 1 })
//             const productData = await productModel.find({ is_hidden: false, is_deleted: false }).populate("category_id", ["category"]);
//             return res.status(200).json({ message: 'Successfully fetched data', error: false , offerData, companyData, productData })
//         } else if (search && brand_id) {
//             var regex = new RegExp(search, "i");
//             const offerData = await offerModel.find({ offer_description: regex, company_id: brand_id, ...query }).populate("label_id", ["title"]).sort({ order: 1 })
//             const companyData = await companyModel.find({}).sort({ company_name: 1 })
//             const productData = await productModel.find({ is_hidden: false, is_deleted: false }).populate("category_id", ["category"]);
//             return res.status(200).json({ message: 'Successfully fetched data', error: false , offerData, companyData, productData })
//         } else {
//             const offerData = await offerModel.find(query).populate("label_id", ["title"]).sort({ order: 1 })
//             const companyData = await companyModel.find({}).sort({ company_name: 1 })
//             const productData = await productModel.find({ is_hidden: false, is_deleted: false }).populate("category_id", ["category"]);
//             return res.status(200).json({ message: 'Successfully fetched data', error: false,  offerData, companyData, productData })
//         }

//     } catch (error) {
//         return res.status(200).json({
//             message: error.message || "Something went wrong",
//             error: true,
//         });
//     }
// }


const offersListingAdmin = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const { brand_id, search, tab } = req.query;
      let query = {};
  
      if (tab == 0) {
        query = { offer_expiry: { $gte: new Date() }, is_hidden: false };
      } else if (tab == 1) {
        query = { offer_expiry: { $lt: new Date() }, is_hidden: false };
      } else {
        query = { is_hidden: true };
      }

      let sortOrder = { order: 1 };

        // 🔹 If tab == 1 (expired), sort by expiry date descending
      if (tab == 1) {
        sortOrder = { offer_expiry: -1 };
      }
  
      let offerQuery = {};
      if (brand_id) {
        offerQuery.company_id = brand_id;
      }
      if (search) {
        const regex = new RegExp(search, "i");
        offerQuery.offer_description = regex;
      }
      let offerData = await offerModel
        .find({ ...offerQuery, ...query })
        .populate("label_id", ["title"])
        .sort(sortOrder);
      const companyData = await companyModel.find({}).sort({ company_name: 1 });
    //   const productData = await productModel
    //     .find({ is_hidden: false, is_deleted: false })
    //     .populate("category_id", ["category"]);
      // 🔹 Group by label title
      const grouped = offerData.reduce((acc, offer) => {
        const labelTitle = offer.label_id?.title || "No Label";
        if (!acc[labelTitle]) acc[labelTitle] = [];
        acc[labelTitle].push(offer);
        return acc;
      }, {});
      // 🔹 Flatten back to single array but grouped label-wise
      offerData = Object.values(grouped).flat();
      return res.status(200).json({
        message: "Successfully fetched data",
        error: false,
        offerData,
        companyData,
        // productData,
      });
    } catch (error) {
      return res.status(200).json({
        message: error.message || "Something went wrong",
        error: true,
      });
    }
  };


  const offersListingForShopPanel = async (req, res) => {
    try {

        const result = validationResult(req);
        if (result.errors.length > 0) {
          return res.status(200).json({
            error: true,
            title: result.errors[0].msg,
            errors: result,
          });
        }

      const shopId = req.shop._id;
  
      const offerData = await offerModel
      .find({
        is_hidden: false,
        shop_id: shopId, 
      })
        .select({ offer_title: 1 })
        .sort({ order: 1 });
  
      return res.status(200).json({
        message: "Successfully fetched data",
        error: false,
        offerData,
      });
    } catch (error) {
      return res.status(200).json({
        error: true,
        message: error.message,
      });
    }
  };
  

const addOffer = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { company_id, offer_title, is_featured, offer_start, offer_expiry, product_details, offer_description, offer_banner, redeem_limit, offer_display, offer_type, unit_percentage, subcategory, category, label_id, shop_id } = req.body

        const newStart = new Date(offer_start);
        const newEnd = new Date(offer_expiry);

        const category_id = await categoryModel.findOne({category: category}).select("_id");    

        const offerLength = await offerModel.count()

        if (
            offer_type === "shop" &&
            (!Array.isArray(shop_id) || shop_id.length === 0)
          ) {
            return res.status(200).json({
              message: "At least one shop is required",
              error: true,
            });
          }

        if (offer_type == "product" || offer_type == "shop") {

            // SORT product_details by rewards
            if (Array.isArray(product_details)) {
                product_details.sort((a, b) => Number(b.reward) - Number(a.reward));
            }

            for (let product of product_details) {
                const rawProductId = product?.product_id?._id || product?.product_id;
                const productId = new ObjectId(rawProductId);

                const overlappingOffer = await offerModel.findOne({
                    offer_type: { $eq: offer_type },
                    "product_details.product_id": productId,
                    $or: [
                        {
                            offer_start: { $lte: newEnd },
                            offer_expiry: { $gte: newStart },
                        }
                    ]
                });

                const productData = await productModel.findById(productId);
            
                if (overlappingOffer) {
                    return res.status(200).json({
                        message: `${productData?.product_name || "Product"} already has an overlapping offer: ${overlappingOffer.offer_title}`,
                        error: true
                    });
                }
            }            
            const no = Math.floor(1000000000 + Math.random() * 9000000000);
            const url = await base64Upload(`offers/banners/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_banner)
            const displayUrl = await base64Upload(`offers/display/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_display)
            const offer = new offerModel(
                {
                    company_id: company_id,
                    offer_title: offer_title,
                    is_featured: is_featured,
                    offer_start: new Date(offer_start).toISOString(),
                    offer_expiry: new Date(offer_expiry).toISOString(),
                    product_details: product_details,
                    offer_description: offer_description,
                    offer_banner: url,
                    offer_display: displayUrl,
                    redeem_limit: redeem_limit,
                    offer_type: offer_type,
                    order: offerLength + 1,
                    unit_percentage: unit_percentage || [],
                    subcategory: subcategory,
                    category_id: category_id,
                    ...(label_id ? { label_id } : {}),
                    ...(shop_id ? { shop_id } : {}),
                }
            )
            await offer.save()
        } else {
            const no = Math.floor(1000000000 + Math.random() * 9000000000);
            const url = await base64Upload(`offers/banners/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_banner)
            const displayUrl = await base64Upload(`offers/display/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_display)
            const offer = new offerModel(
                {
                    offer_title: offer_title,
                    is_featured: is_featured,
                    offer_start: new Date(offer_start),
                    offer_expiry: new Date(offer_expiry),
                    offer_description: offer_description,
                    offer_banner: url,
                    offer_display: displayUrl,
                    offer_type: offer_type,
                    order: offerLength + 1,
                    unit_percentage: unit_percentage || [],
                    subcategory: subcategory,
                    category_id: category_id,
                    ...(label_id ? { label_id } : {}),
                    ...(shop_id ? { shop_id } : {}),
                }
            )
            await offer.save()
        }

        return res.status(200).json({ message: 'Successfully saved your offer' , error: false })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

// const editOffer = async (req, res) => {
//     try {
//         const result = validationResult(req);
//         if (result.errors.length > 0) {
//             return res.status(200).json({
//                 error: true,
//                 title: result.errors[0].msg,
//                 errors: result,
//             });
//         }
//         const { id, offer_title, is_featured, company_id, offer_start, offer_expiry, product_details, offer_description, offer_banner, redeem_limit, offer_display, offer_type, unit_percentage, subcategory, category_id, label_id } = req.body

//         const newStart = new Date(offer_start);
// const newEnd = new Date(offer_expiry);


//         if (offer_type == "product") {
//             for (let product of product_details) {
//                 const productId = new ObjectId(product.product_id._id);

//                 // Check for overlapping offers except the current one
//                 const overlappingOffer = await offerModel.findOne({
//                     "product_details.product_id": productId,
//                     _id: { $ne: new ObjectId(id) },
//                     $or: [
//                         {
//                             offer_start: { $lte: newEnd },
//                             offer_expiry: { $gte: newStart },
//                         }
//                     ]
//                 });
                
//                 const productData = await productModel.findById(productId);
                
//                 if (overlappingOffer) {
//                     return res.status(200).json({
//                         message: `${productData.product_name} already has an overlapping offer: ${overlappingOffer.offer_title}`,
//                         error: true
//                     });
//                 }
//             }
//             let url = offer_banner
//             if (offer_banner && !offer_banner.includes('https://s3.ap-south-1.amazonaws.com/')) {
//                 const no = Math.floor(1000000000 + Math.random() * 9000000000);
//                 url = base64Upload(`offers/banner/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_banner)
//             }
//             let displayUrl = offer_display
//             if (offer_display && !offer_display.includes('https://s3.ap-south-1.amazonaws.com/')) {
//                 const no = Math.floor(1000000000 + Math.random() * 9000000000);
//                 displayUrl = base64Upload(`offers/banner/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_display)
//             }

//             await offerModel.findByIdAndUpdate(id, {
//                 offer_title: offer_title,
//                 is_featured: is_featured,
//                 company_id: company_id,
//                 offer_start: new Date(offer_start),
//                 offer_expiry: new Date(offer_expiry),
//                 product_details: product_details,
//                 offer_description: offer_description,
//                 offer_banner: url,
//                 redeem_limit: redeem_limit,
//                 offer_display: displayUrl,
//                 unit_percentage: unit_percentage || [],
//                 subcategory: subcategory,
//                 category_id: category_id,
//                 ...(label_id ? { label_id } : {}),

//             });
//         } else {
//             let url = offer_banner
//             if (offer_banner && !offer_banner.includes('https://s3.ap-south-1.amazonaws.com/')) {
//                 const no = Math.floor(1000000000 + Math.random() * 9000000000);
//                 url = base64Upload(`offers/banner/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_banner)
//             }
//             let displayUrl = offer_display
//             if (offer_display && !offer_display.includes('https://s3.ap-south-1.amazonaws.com/')) {
//                 const no = Math.floor(1000000000 + Math.random() * 9000000000);
//                 displayUrl = base64Upload(`offers/banner/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_display)
//             }
//             await offerModel.findByIdAndUpdate(id, {
//                 offer_title: offer_title,
//                 is_featured: is_featured,
//                 offer_start: new Date(offer_start),
//                 offer_expiry: new Date(offer_expiry),
//                 offer_description: offer_description,
//                 offer_banner: url,
//                 offer_display: displayUrl,
//                 unit_percentage: unit_percentage || [],
//                 subcategory: subcategory,
//                 category_id: category_id,
//                 ...(label_id ? { label_id } : {}),
//             });
//         }

//         return res.status(200).json({ message: "Successfully updated your product" , error: false })
//     } catch (error) {
//         console.log(error)
//         return res.status(200).json({
//             message: error.message || "Something went wrong",
//             error: true,
//         });
//     }
// }


const editOffer = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { id, offer_title, is_featured, company_id, offer_start, offer_expiry, product_details, offer_description, offer_banner, redeem_limit, offer_display, offer_type, unit_percentage, subcategory, category, label_id, shop_id } = req.body

        const newStart = new Date(offer_start);
        const newEnd = new Date(offer_expiry);

        const category_id = await categoryModel.findOne({category: category}).select("_id");    

        // Prepare common update data
        const updateData = {
            offer_title,
            is_featured,
            offer_start: new Date(offer_start),
            offer_expiry: new Date(offer_expiry),
            offer_description,
            offer_banner: offer_banner && !offer_banner.includes('https://s3.ap-south-1.amazonaws.com/')
                ? await base64Upload(`offers/banner/${company_id}`, `${Math.floor(1000000000 + Math.random() * 9000000000)}.jpeg`, "image/jpeg", offer_banner)
                : offer_banner,
            offer_display: offer_display && !offer_display.includes('https://s3.ap-south-1.amazonaws.com/')
                ? await base64Upload(`offers/banner/${company_id}`, `${Math.floor(1000000000 + Math.random() * 9000000000)}.jpeg`, "image/jpeg", offer_display)
                : offer_display,
            unit_percentage: unit_percentage || [],
            subcategory,
            category_id,
            shop_id: shop_id || [],
        };

        // Handle label_id: if empty or undefined, remove it
        if (label_id !== undefined && label_id !== "") {
            updateData.label_id = label_id;
        } else {
            updateData.$unset = { label_id: "" };
        }

        if (
            offer_type === "shop" &&
            (!Array.isArray(shop_id) || shop_id.length === 0)
          ) {
            return res.status(200).json({
              message: "At least one shop is required",
              error: true,
            });
          }

        if (offer_type === "product" || offer_type == "shop") {

            // SORT product_details by rewards
            if (Array.isArray(product_details)) {
                product_details.sort((a, b) => Number(b.reward) - Number(a.reward));
            }

            updateData.company_id = company_id;
            updateData.product_details = product_details;
            updateData.redeem_limit = redeem_limit;

            // Check overlapping offers
            for (let product of product_details) {
                const rawProductId = product?.product_id?._id || product?.product_id;
                const productId = new ObjectId(rawProductId);
                const overlappingOffer = await offerModel.findOne({
                    offer_type: { $eq: offer_type },
                    "product_details.product_id": productId,
                    _id: { $ne: new ObjectId(id) },
                    $or: [{ offer_start: { $lte: newEnd }, offer_expiry: { $gte: newStart } }]
                });

                const productData = await productModel.findById(productId);
                if (overlappingOffer) {
                    return res.status(200).json({
                        message: `${productData.product_name} already has an overlapping offer: ${overlappingOffer.offer_title}`,
                        error: true
                    });
                }
            }
        }

        await offerModel.findByIdAndUpdate(id, updateData);

        return res.status(200).json({ message: "Successfully updated your product", error: false });
    } catch (error) {
        console.log(error);
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}


const cloneOffer = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const {
            company_id,
            offer_title,
            is_featured,
            offer_start,
            offer_expiry,
            product_details,
            offer_description,
            offer_banner,
            redeem_limit,
            offer_display,
            offer_type,
            unit_percentage,
            subcategory,
            category,
            label_id,
            shop_id,
        } = req.body;

        const newStart = new Date(offer_start);
        const newEnd = new Date(offer_expiry);

        const category_id = await categoryModel.findOne({category: category}).select("_id");    

        if (
            offer_type === "shop" &&
            (!Array.isArray(shop_id) || shop_id.length === 0)
          ) {
            return res.status(200).json({
              message: "At least one shop is required",
              error: true,
            });
          }

        if (offer_type === "product" || offer_type == "shop") {

            // SORT product_details by rewards
            if (Array.isArray(product_details)) {
                product_details.sort((a, b) => Number(b.reward) - Number(a.reward));
            }

            const allOffers = await offerModel.find({ offer_type: "product" });

            for (let product of product_details) {
                const rawProductId = product?.product_id?._id || product?.product_id;

                if (!ObjectId.isValid(rawProductId)) {
                    return res.status(400).json({ error: true, message: "Invalid product ID" });
                }

                const productId = new ObjectId(rawProductId);

                const overlappingOffer = await offerModel.findOne({
                    offer_type: { $eq: offer_type },
                    "product_details.product_id": productId,
                    $or: [
                        {
                            offer_start: { $lte: new Date(offer_expiry) },
                            offer_expiry: { $gte: new Date(offer_start) },
                        }
                    ]
                });

                const productData = await productModel.findById(productId);

                if (overlappingOffer) {
                    return res.status(200).json({
                        message: `${productData?.product_name || 'Product'} already has an overlapping offer: ${overlappingOffer.offer_title}`,
                        error: true
                    });
                }
            }
        }

        const offerLength = await offerModel.count();
        const no = Math.floor(1000000000 + Math.random() * 9000000000);

         let bannerUrl = offer_banner;
         if (typeof offer_banner === 'string' && offer_banner.startsWith("data:image/")) {
             bannerUrl = await base64Upload(`offers/banners/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_banner);
         }
 
         let displayUrl = offer_display;
         if (typeof offer_display === 'string' && offer_display.startsWith("data:image/")) {
             displayUrl = await base64Upload(`offers/display/${company_id}`, `${no}.jpeg`, "image/jpeg", offer_display);
         }

        const newOffer = new offerModel({
            company_id,
            offer_title,
            is_featured,
            offer_start: newStart,
            offer_expiry: newEnd,
            product_details,
            offer_description,
            offer_banner: bannerUrl,
            offer_display: displayUrl,
            redeem_limit,
            offer_type,
            order: offerLength + 1,
            unit_percentage: unit_percentage || [],
            subcategory: subcategory,
            category_id: category_id,
            ...(label_id ? { label_id } : {}),
            ...(shop_id ? { shop_id } : {}),
        });

        await newOffer.save();

        return res.status(200).json({ message: 'Successfully cloned the offer' , error: false });

    } catch (error) {
        console.error(error);
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};



const offerDetails = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { id } = req.query
        const offerData = await offerModel.findById(id).populate('product_details.product_id', ['is_hidden', 'is_deleted']).populate("category_id" , ["category"])
        const companyData = await companyModel.find({}).sort({ company_name: 1 })
        const productData = await productModel.find({company_id:offerData.company_id, is_hidden: false, is_deleted: false }).populate("category_id", ["category"]);
        return res.status(200).json({ message: 'Successfully fetched data', error: false, offerData, companyData, productData })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const deleteOffer = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { id } = req.query
        await offerModel.findByIdAndDelete(id)
        return res.status(200).json({ message: 'Successfully deleted offer' , error: false })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const redeemOffer = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { _id } = req.user
        const redeemData = await redeemModel.aggregate([
            { $match: { customer_id: _id } }, // Match documents for the given customerId
            { $unwind: "$offer_id" }, // Unwind the array of offerIds
            { $group: { _id: "$offer_id", count: { $sum: 1 } } } // Group by offerId and count occurrences
        ]);
        const customerRewards = await customerModel.findById(_id).select('rewards')
        return res.status(200).json({ message: 'Successfully fetched data', error: false , redeemData, customerRewards })

    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const deleteOffers = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { offers } = req.body
        const objectIds = offers.map(val => new ObjectId(val._id));

        await offerModel.deleteMany({
            _id: { $in: objectIds },
        });
        return res.status(200).json({ message: "Successfully deleted offers" , error: false })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const addLabel = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const { title } = req.body;
  
      const newLabel = new labelModel({
        title: title.trim(),
      });
  
      await newLabel.save();
  
      return res.status(200).json({
        error: false,
        message: "Label created successfully",
        data: newLabel,
      });
    } catch (error) {
      console.error(error);
      return res.status(200).json({
        error: true,
        message: error.message || "Something went wrong",
      });
    }
  };

const editLabel = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const { id, title } = req.body;
  
      const updated = await labelModel.findByIdAndUpdate(
        id,
        { title: title.trim() },
        { new: true }
      );
  
      if (!updated) {
        return res.status(200).json({
          error: true,
          message: "Label not found",
        });
      }
  
      return res.status(200).json({
        error: false,
        message: "Label updated successfully",
        label: updated,
      });
    } catch (error) {
      console.error(error);
      return res.status(200).json({
        error: true,
        message: error.message || "Something went wrong",
      });
    }
};

const deleteLabel = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const { id } = req.body;
  
      const deleted = await labelModel.findByIdAndDelete(id);
  
      if (!deleted) {
        return res.status(200).json({
          error: true,
          message: "Label not found",
        });
      }
  
      return res.status(200).json({
        error: false,
        message: "Label deleted successfully",
      });

    } catch (error) {
      console.error(error);
      return res.status(200).json({
        error: true,
        message: error.message || "Something went wrong",
      });
    }
  };

  const getAllLabels = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const labels = await labelModel.find().sort({ order: 1, createdAt: -1 });

        return res.status(200).json({
            error: false,
            message: "Labels fetched successfully",
            labels
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({
            error: true,
            message: error.message || "Something went wrong",
        });
    }
};

const getDropdownData = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const labels = await labelModel.find().sort({ order: 1, createdAt: -1 });

        const shops = await shop.find({
            is_dark: { $ne: true } 
          }).lean().select("shop_name").sort({ createdAt: -1 });

        return res.status(200).json({
            error: false,
            message: "Dropdown Data fetched successfully",
            labels,
            shops
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({
            error: true,
            message: error.message || "Something went wrong",
        });
    }
};


const hideOffer = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { id, type } = req.query
        await offerModel.findByIdAndUpdate(id, { is_hidden: type == "hide" ? true : false })
        return res.status(200).json({ message: 'Successfully updated offer' , error: false })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const HideUnhideOffers = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { offers, type } = req.body
        const objectIds = offers.map(val => new ObjectId(val._id));

        await offerModel.updateMany({
            _id: { $in: objectIds },
        }, { $set: { is_hidden: type == "hide" ? true : false } });
        return res.status(200).json({ message: "Successfully updated offers" , error: false })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const changeOfferOrder = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }
        const { offers } = req.body
        let i = 1
        for (let offer of offers) {
            await offerModel.findByIdAndUpdate(offer._id, { order: i })
            i += 1
        }
        return res.status(200).json({ error: false, message: "Successfully updated offers" })
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const changeLabelOrder = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const { labels } = req.body;

        let i = 1;
        for (let label of labels) {
            await labelModel.findByIdAndUpdate(label._id, { order: i });
            i += 1;
        }

        return res
            .status(200)
            .json({
                error: false,
                message: "Successfully updated labels order",
            });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};


const addFavouriteOffer = async (req,res) => {
    try{
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const { _id } = req.user
        const { offer_id } = req.body
        
        await favouriteOfferModel.create({customer_id:_id, offer_id: offer_id});
        
        return res.status(200).json({message:"Successfully added offer to favourites", error: false})

    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const deleteFavouriteOffer = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const { _id } = req.user;
        const { offer_id } = req.query;

        const deleted = await favouriteOfferModel.findOneAndDelete({
            customer_id: _id,
            offer_id: offer_id,
        });

        if (!deleted) {
            return res.status(404).json({
                error: true,
                message: "Favourite offer not found",
            });
        }

        return res.status(200).json({
            message: "Successfully removed offer from favourites",
            error: false,
        });
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
};

const getFavouriteOffers = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

        const { _id } = req.user;
        const { label } = req.query; // active | expired | upcoming (optional)

        // fetch favourites with populated offers
        let favouriteOffers = await favouriteOffer
            .find({ customer_id: _id })
            .populate("offer_id")
            .sort({ createdAt: -1 });

        const now = new Date();

        if (label === "active") {
            favouriteOffers = favouriteOffers.filter(fav => {
                if (!fav.offer_id) return false;
                return (
                    fav.offer_id.offer_start <= now &&
                    fav.offer_id.offer_expiry >= now
                );
            });
        } else if (label === "expired") {
            favouriteOffers = favouriteOffers.filter(fav => {
                if (!fav.offer_id) return false;
                return fav.offer_id.offer_expiry < now;
            });
        } 
        
        // else if (label === "upcoming") {
        //     favouriteOffers = favouriteOffers.filter(fav => {
        //         if (!fav.offer_id) return false;
        //         return fav.offer_id.offer_start > now;
        //     });
        // }

        return res.status(200).json({
            error: false,
            message: "Favourite offers fetched successfully",
            favouriteOffers,
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({
            error: true,
            message: error.message || "Something went wrong",
        });
    }
};



// const getFavouriteOffers = async (req, res) => {
//     try {
//         const result = validationResult(req);
//         if (result.errors.length > 0) {
//             return res.status(200).json({
//                 error: true,
//                 title: result.errors[0].msg,
//                 errors: result,
//             });
//         }

//         const { _id } = req.user;

//         const favouriteOffers = await favouriteOffer.find({customer_id: _id}).populate('offer_id', []).sort({ createdAt: -1 });

//         return res.status(200).json({
//             error: false,
//             message: "Favourite offers fetched successfully",
//             favouriteOffers,
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(200).json({
//             error: true,
//             message: error.message || "Something went wrong",
//         });
//     }
// };


const getFeaturedOffers = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const query = {
        is_featured: true,
        is_hidden: false,
        offer_expiry: {$gte: new Date()}
      };
  
      const featuredOffers = await offerModel
        .find(query)
        .populate("label_id", ["title"])
        .sort({ banner_order: 1, createdAt: 1 });
  
      return res.status(200).json({
        error: false,
        message: "Featured offers fetched successfully",
        data: featuredOffers,
      });
    } catch (error) {
      return res.status(200).json({
        error: true,
        message: error.message || "Something went wrong",
      });
    }
  };


  const updateFeaturedBannerOrder = async (req, res) => {
      try {
          const result = validationResult(req);
          if (result.errors.length > 0) {
              return res.status(200).json({
                  error: true,
                  title: result.errors[0].msg,
                  errors: result,
              });
          }

          const { offers = [] } = req.body;

          if (!offers.length) {
              return res.status(200).json({
                  error: true,
                  title: "No offers provided",
              });
          }

          const bulkOps = offers.map((item) => ({
              updateOne: {
                  filter: { _id: item._id },
                  update: { $set: { banner_order: item.banner_order } },
              },
          }));

          await offerModel.bulkWrite(bulkOps);

          return res.status(200).json({
              error: false,
              message: "Banner order updated successfully",
          });
      } catch (error) {
          return res.status(200).json({
              error: true,
              message: error.message || "Failed to update banner order",
          });
      }
  };


  const getCitiesByState = async (req, res) => {
    try {

        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        }

      const { state } = req.body;
  
      if (!state) {
        return res.status(200).json({
          error: true,
          message: "State is required",
        });
      }
  
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        {
          country: "India",
          state: state,
        },
        {
          timeout: 10000,
        }
      );
  
      if (data.error) {
        return res.status(200).json({
          error: true,
          message: data.msg || "Failed to fetch cities",
        });
      }
  
      return res.status(200).json({
        error: false,
        data: data.data || [],
      });
    } catch (err) {
      return res.status(200).json({
        error: true,
        message: err.message || "Something went wrong",
      });
    }
  };


  const getLocalitiesByCity = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const { country, state, city } = req.body;
  
      if (!country || !state || !city) {
        return res.status(200).json({
          error: true,
          message: "Country, state, and city are required",
        });
      }
  
      // 1️⃣ Geocode city to get center + bounds
      const geoRes = await axios.get(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {
          params: {
            address: `${city}, ${state}, ${country}`,
            key: process.env.GOOGLE_MAPS_KEY,
          },
        }
      );
  
      const cityData = geoRes.data?.results?.[0];
  
      if (!cityData) {
        return res.status(200).json({
          error: true,
          message: "Unable to geocode city",
        });
      }
  
      const location = cityData.geometry.location;
      const viewport = cityData.geometry.viewport;
  
      // 2️⃣ Get localities using Places Autocomplete with strict bounds
      const placesRes = await axios.get(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json",
        {
          params: {
            input: "", // empty to get all localities (or partial user input)
            types: "geocode",
            locationbias: `rectangle:${viewport.southwest.lat},${viewport.southwest.lng}|${viewport.northeast.lat},${viewport.northeast.lng}`,
            key: process.env.GOOGLE_MAPS_KEY,
          },
        }
      );
  
      // 3️⃣ Filter only proper sublocalities / neighborhoods
      const localities = placesRes.data.predictions
        .filter(p =>
          p.types.includes("sublocality_level_1") ||
          p.types.includes("locality") ||
          p.types.includes("neighborhood")
        )
        .map(p => ({
          name: p.structured_formatting.main_text,
          place_id: p.place_id,
        }));
  
      return res.status(200).json({
        error: false,
        data: localities,
        city_center: location,
        city_bounds: viewport,
      });
    } catch (err) {
      return res.status(200).json({
        error: true,
        message: err.message || "Something went wrong",
      });
    }
  };


  const searchOffer = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const { search } = req.query;
    const today = new Date();

    const filter = {
      is_hidden: false,
      offer_start: { $lte: today },
      offer_expiry: { $gte: today },
    };
  
      // Search only on title & description
      if (search) {
        filter.$or = [
          { offer_title: { $regex: search, $options: "i" } },
          { offer_description: { $regex: search, $options: "i" } },
        ];
      }
  
      const offerData = await offerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .select("_id offer_title offer_description offer_display")
  
      return res.status(200).json({
        message: "Successfully fetched offers",
        error: false,
        offerData,
        totalCount: offerData.length,
      });
  
    } catch (error) {
      return res.status(200).json({
        message: error.message || "Something went wrong",
        error: true,
      });
    }
  };
  
  

module.exports = {
    offersListing,
    offerRedeemStatus,
    addOffer,
    addFavouriteOffer,
    deleteFavouriteOffer,
    getFavouriteOffers,
    offersListingAdmin,
    offersListingForShopPanel,
    editOffer,
    cloneOffer,
    offerDetails,
    deleteOffer,
    redeemOffer,
    deleteOffers,
    HideUnhideOffers,
    hideOffer,
    changeOfferOrder,
    changeLabelOrder,
    addLabel,
    editLabel,
    deleteLabel,
    getAllLabels,
    getDropdownData,
    getFeaturedOffers,
    updateFeaturedBannerOrder,
    getCitiesByState,
    getLocalitiesByCity,
    searchOffer,
};