const productModel = require('../models/product')
const {validationResult} = require('express-validator')
const companyModel = require('../models/company')
const categoryModel = require('../models/category')
const aliasModel = require('../models/alias')
const cartModel = require('../models/cart')
const unitModel = require('../models/unit')
const xlsx = require('xlsx');
const fs = require('fs'); 
const mongoose = require("mongoose");
const { base64Upload, uploadImageFromUrl } = require('../lib/helper');
const ObjectId = mongoose.Types.ObjectId;
const ExcelJS = require('exceljs');
const offer = require('../models/offer')
// const dummyProd = require('../models/dummyProd')


const productsListing = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        } 
        const { subcategory, category_id, page, limit, search } = req.query
        let skip = (page - 1) * limit
        if(subcategory){
            var subcategoryRegex = new RegExp(subcategory, "i");
            const productData = await productModel.find({category_id:category_id, is_deleted:false, is_hidden:false, subcategory: subcategoryRegex}).skip(skip).limit(limit)
            const productCount = await productModel.countDocuments({category_id:category_id, is_deleted:false, is_hidden:false,subcategory: subcategoryRegex})
            return res.status(200).json({message:'Successfully fetched data', error: false , productData,productCount})
        } else if(search){
            var regex = new RegExp(search, "i");
            if(category_id){
                const productData = await productModel.find({product_name:regex,category_id:category_id, is_deleted:false, is_hidden:false}).skip(skip).limit(limit)
                const productCount = await productModel.countDocuments({product_name:regex,category_id:category_id, is_hidden:false, is_deleted:false})
                return res.status(200).json({message:'Successfully fetched data', error: false , productData,productCount})
            } else {
                const productData = await productModel.find({product_name:regex, is_deleted:false, is_hidden:false}).skip(skip).limit(limit)
                const productCount = await productModel.countDocuments({product_name:regex, is_hidden:false, is_deleted:false})
                return res.status(200).json({message:'Successfully fetched data',error: false , productData,productCount})
            }
            
        } else {
            const productData = await productModel.find({category_id:category_id, is_deleted:false, is_hidden:false}).skip(skip).limit(limit)
            const productCount = await productModel.countDocuments({category_id:category_id, is_deleted:false, is_hidden:false})
            const subCategoryData = await productModel.aggregate([
                {
                    $match: {
                        category_id:new ObjectId(category_id) 
                    }
                },
                {
                    $group: {
                      _id:'$subcategory'
                    }
                }
            ])
            return res.status(200).json({message:'Successfully fetched data', error: false , productData,subCategoryData,productCount})
        }
       
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}
  
// const productsListingAdmin = async (req, res) => {
//     try {
//       const result = validationResult(req);
//       if (result.errors.length > 0) {
//         return res.status(200).json({
//           error: true,
//           title: result.errors[0].msg,
//           errors: result,
//         });
//       }
  
//       let { search, brand_id, tab, page = 1, limit = 100 } = req.query;
//       page = parseInt(page);
//       limit = parseInt(limit);
//       const skip = (page - 1) * limit;
  
//       const filter = {
//         is_deleted: false,
//         is_hidden: tab == 0 ? false : true,
//       };
  
//       // --- Expanded search logic ---
//       if (search) {
//         filter.$or = [
//           { product_name: { $regex: search, $options: "i" } },
//           { subcategory: { $regex: search, $options: "i" } },
//           { SKU: { $regex: search, $options: "i" } },
//         ];
//       }
  
//       if (brand_id) {
//         filter.company_id = brand_id;
//       }
  
//       const [
//         productData,
//         totalCount,
//         companyData,
//         categoryData,
//         subcategoryData,
//         unitData,
//       ] = await Promise.all([
//         productModel.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
//         productModel.countDocuments(filter),
//         companyModel.find({}).sort({ company_name: 1 }),
//         categoryModel.find({}),
//         productModel.distinct("subcategory"),
//         unitModel.find({}),
//       ]);
  
//       return res.status(200).json({
//         message: "Successfully fetched data",
//         error: false,
//         productData,
//         totalCount,
//         companyData,
//         categoryData,
//         subcategoryData,
//         unitData,
//         currentPage: page,
//         totalPages: Math.ceil(totalCount / limit),
//       });
//     } catch (error) {
//       return res.status(200).json({
//         message: error.message || "Something went wrong",
//         error: true,
//       });
//     }
//   };


const productsListingAdmin = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      let { search, brand_id, tab, page = 1, limit = 100 } = req.query;
      page = parseInt(page);
      limit = parseInt(limit);
      const skip = (page - 1) * limit;
  
      const filter = {
        is_deleted: false,
        is_hidden: tab == 0 ? false : true,
      };
  
      if (search) {

        const matchingCategories = await categoryModel
          .find({ category: { $regex: search, $options: "i" } })
          .select("_id");
  
        const categoryIds = matchingCategories.map(cat => cat._id);
  
        filter.$or = [
          { product_name: { $regex: search, $options: "i" } },
          { subcategory: { $regex: search, $options: "i" } },
          { SKU: { $regex: search, $options: "i" } },
          { category_id: { $in: categoryIds } },
        ];
      }
  
      if (brand_id) {
        filter.company_id = brand_id;
      }
  
      const [
        productData,
        totalCount,
        companyData,
        categoryData,
        subcategoryData,
        unitData,
      ] = await Promise.all([
        productModel.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limit),
        productModel.countDocuments(filter),
        companyModel.find({}).sort({ company_name: 1 }),
        categoryModel.find({}),
        productModel.distinct("subcategory"),
        unitModel.find({}),
      ]);
  
      return res.status(200).json({
        message: "Successfully fetched data",
        error: false,
        productData,
        totalCount,
        companyData,
        categoryData,
        subcategoryData,
        unitData,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (error) {
      return res.status(200).json({
        message: error.message || "Something went wrong",
        error: true,
      });
    }
  };

  const getAddProductModalData = async (req, res) => {
    try {

      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }

      const [
        companyData,
        categoryData,
        subcategoryData,
        unitData,
      ] = await Promise.all([
        companyModel.find({}).sort({ company_name: 1 }),
        categoryModel.find({}),
        productModel.distinct("subcategory"),
        unitModel.find({}),
      ]);
  
      return res.status(200).json({
        message: "Successfully fetched add product modal data",
        error: false,
        companyData,
        categoryData,
        subcategoryData,
        unitData,
      });

    } catch (error) {
      return res.status(200).json({
        message: error.message || "Something went wrong",
        error: true,
      });
    }
};
  


const addProduct = async (req, res) => {
  try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
          return res.status(200).json({
              error: true,
              title: result.errors[0].msg,
              errors: result,
          });
      } 

      const { product_name, product_image, description, subcategory, quantity, company_id, category_id, SKU, unit, price} = req.body
      
      const nameString = (product_name.replace(/ +/g, ' ')).trim();
      const escapedNameString = nameString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const productRegex = new RegExp(escapedNameString,"i")

      const productExists = await productModel.find({product_name:productRegex,quantity:quantity,unit:unit})
      if(productExists.length > 0){
          return res.status(200).json({error:true, message:'Product already exists'})
      }

      const skuExists = await productModel.findOne({ SKU });
      if (skuExists) {
          return res.status(200).json({ error: true, message: "SKU already exists" });
      }
  
      const url = await base64Upload(`products`,`${product_name}q-${quantity}${unit}.jpeg`,"image/jpeg",product_image)

      const product = new productModel({
          product_name:nameString,
          product_image:url,
          product_desc:description,
          subcategory:subcategory,
          quantity:quantity,
          company_id:company_id,
          category_id:category_id,
          SKU:SKU,
          unit:unit,
          price:price,
      })
      
      const saved = await product.save()

      // after creating product -> create alias doc
      await aliasModel.updateOne(
          { product_id: saved._id, alias: nameString },
          { product_id: saved._id, product_name: nameString, alias: nameString },
          { upsert: true }
      )

      return res.status(200).json({message:"Successfully saved your product" , error: false , product: saved });
  } catch (error) {
      return res.status(200).json({
          message: error.message || "Something went wrong",
          error: true,
      });
  }
}


const addProductForScanOrder = async (req, res) => {
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
      product_name,
      product_image = "",
      description = "",
      subcategory,
      quantity,
      company_id,
      category_id,
      SKU,
      unit,
      price
    } = req.body;

    const nameString = product_name.replace(/ +/g, " ").trim();
    const escapedNameString = nameString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const productRegex = new RegExp(escapedNameString, "i");

    const productExists = await productModel.find({
      product_name: productRegex,
      quantity,
      unit
    });

    if (productExists.length > 0) {
      return res.status(200).json({ error: true, message: "Product already exists" });
    }

    const skuExists = await productModel.findOne({ SKU });
    if (skuExists) {
      return res.status(200).json({ error: true, message: "SKU already exists" });
    }

    let imageUrl = "";
    if (product_image) {
      imageUrl = await base64Upload(
        "products",
        `${product_name}q-${quantity}${unit}.jpeg`,
        "image/jpeg",
        product_image
      );
    }

    const product = new productModel({
      product_name: nameString,
      product_image: imageUrl,
      product_desc: description,
      subcategory,
      quantity,
      company_id,
      category_id,
      SKU,
      unit,
      price,
    });

    const saved = await product.save();

    await aliasModel.updateOne(
      { product_id: saved._id, alias: nameString },
      { product_id: saved._id, product_name: nameString, alias: nameString },
      { upsert: true }
    );

    return res.status(200).json({
      message: "Successfully saved your product",
      error: false,
      product: saved
    });

  } catch (error) {
    return res.status(200).json({
      message: error.message || "Something went wrong",
      error: true,
    });
  }
};


const editProduct = async (req,res) => {
  try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
          return res.status(200).json({
              error: true,
              title: result.errors[0].msg,
              errors: result,
          });
      } 

      const {id,product_name,quantity,unit,product_image,description,category_id,subcategory,price} = req.body
      
      // get old product before updating
      const oldProd = await productModel.findById(id).lean();

      let nameChanged = false;

      if(oldProd && oldProd.product_name !== product_name){
          nameChanged = true;
      }

      let url = product_image
      if (product_image && !product_image.includes('https://s3.ap-south-1.amazonaws.com/')) {
          url = await base64Upload(`products`,`${product_name}q-${quantity}${unit}.jpeg`,"image/jpeg",product_image)
      }

      await productModel.findByIdAndUpdate(id,{product_image:url,product_desc:description,category_id,product_name,subcategory,price});

      // update offer product_name and product_image
      await offer.updateMany({"product_details.product_id":id},{$set: { "product_details.$.product_name": product_name, "product_details.$.product_image": url }});

      // if product_name changed → reset aliases
      if(nameChanged) {

          // delete all present aliases for this product
          await aliasModel.deleteMany({ product_id:id });

          // insert new alias document where alias = product_name
          await aliasModel.updateOne(
            { product_id:id, alias:product_name },
            { product_id:id, product_name:product_name, alias:product_name },
            { upsert:true }
          )
      }

      return res.status(200).json({message:"Successfully updated your product" , error: false })

  } catch (error) {
      return res.status(200).json({
          message: error.message || "Something went wrong",
          error: true,
      });
  }
}

const deleteProduct = async (req, res) => {
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

      // soft delete product
      await productModel.findByIdAndUpdate(id,{is_deleted:true})

      // delete all aliases linked to this product
      await aliasModel.deleteMany({ product_id:id })

      return res.status(200).json({message:'Successfully deleted product' , error: false })

  } catch (error) {
      return res.status(200).json({
          message: error.message || "Something went wrong",
          error: true,
      });
  }
}

const uploadCSV = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        } 
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        let rows = []
        let SKUArr = []
        for(let [index,data] of jsonData.entries()){
            SKUArr.push(data.SKU)
            const brandString = data.Brand ? (data.Brand.replace(/ +/g, ' ')).trim() : "";
            const escapedBrand = brandString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const brandRegex = new RegExp(`^${escapedBrand}$`, "i");
            const categoryString = data.Category ? (data.Category.replace(/ +/g, ' ')).trim() : "";
            const categoryRegex = new RegExp(`${categoryString}`,"i")
            const nameString = data.Name ? (data.Name.replace(/ +/g, ' ')).trim() : "";
            const escapedNameString = nameString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // const productRegex = new RegExp(escapedNameString,"i")
            const subcategoryString = data["Sub Category"] ? ((data["Sub Category"]).replace(/ +/g, ' ')).trim() : "";
            const subcategory = subcategoryString.replace(/\b\w/g, function(char) {
                return char.toUpperCase();
            });
            const SKUString = data.SKU ? (String(data.SKU).replace(/ +/g, ' ')).trim() : "";

            if(!brandString || !categoryString || !nameString || !subcategoryString  || !data.Quantity || !data.Unit || !SKUString || !data["Selling Price"]){
              rows.push(index + 2)
              continue
            }

           

            if(data.Quantity < 0 || data["Selling Price"] < 0){

                rows.push(index + 2)
                continue
            }

            

            if(isNaN(data.Quantity) || !isNaN(Number(data.Unit)) || isNaN(data["Selling Price"])){

                rows.push(index + 2)
                continue
            }

            
            const brand = await companyModel.findOneAndUpdate({company_name:brandRegex},{$setOnInsert:{company_name:brandString}},{upsert:true,returnDocument:'after'})
            const category = await categoryModel.findOneAndUpdate({category:categoryRegex},{$setOnInsert:{category:categoryString}},{upsert:true,returnDocument:'after'})
            
            const units = await unitModel.findOneAndUpdate({},{$addToSet: { units: data.Unit }},{upsert:true, returnDocument: "after" })
            let url = ""
            if(data.Image){
                url = await uploadImageFromUrl(data.Image,`products`,`${nameString}q-${data.Quantity}${data.Unit}.jpeg`,"image/jpeg")
            }
           
            // const product = await productModel.findOne({SKU:SKUString})

            // if(!product){
            //     await productModel.create(
            //         {
            //             product_name: nameString,
            //             // product_image: url,
            //             product_desc: data.Description ? data.Description : "",
            //             subcategory: subcategory,
            //             quantity: data.Quantity,
            //             company_id: brand._id,
            //             category_id: category._id,
            //             // variant: data.Variant,
            //             SKU: SKUString,
            //             unit: data.Unit,
            //             price: data["Selling Price"]
            //         },
            //     );
            // } else {
            //     await productModel.findOneAndUpdate(
            //         { SKU: SKUString },
            //         {
            //             price: data["Selling Price"]
            //         }
            //     );
            // }
            const product = await productModel.findOneAndUpdate(
              { SKU: SKUString },
              {
                product_name: nameString,
                // product_image: url,
                product_desc: data.Description ? data.Description : "",
                subcategory: subcategory,
                quantity: data.Quantity,
                company_id: brand._id,
                category_id: category._id,
                // variant: data.Variant,
                SKU: SKUString,
                unit: data.Unit,
                price: data["Selling Price"]

              },
              { upsert: true, returnDocument: "after" }
            );
        }
        fs.unlinkSync(req.file.path)
        console.log("File Successfully deleted")
        console.log(JSON.stringify(rows))
        await productModel.updateMany({SKU:{$nin:SKUArr}, is_hidden: false},{is_hidden:true})
        await productModel.updateMany({SKU:{$in:SKUArr}, is_hidden: true},{is_hidden:false})
        await cartModel.deleteMany()
        return res.status(200).json({message:"File uploaded and processed successfully!", error: false , rows,length:rows.length});
    } catch (error) {
        console.log(error)
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
 }

 const downloadCsv = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        } 
        const filePath = process.cwd() + `/public/templates/ProductsTemplate.xlsx`
        return res.sendFile(filePath)
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const hideProduct = async (req, res) => {
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
        await productModel.findByIdAndUpdate(id,{is_hidden: type == "hide" ? true : false})
        return res.status(200).json({message:'Successfully deleted offer', error: false})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const HideUnhideProducts = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        } 
        const { products, type } = req.body
        const objectIds = products.map(val => new ObjectId(val._id));
    
        await productModel.updateMany({
            _id: { $in: objectIds },
        }, { $set:{is_hidden: type == "hide" ? true : false }}); 
        return res.status(200).json({message:"Successfully updated products", error: false})  
     } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const deleteProducts = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        } 
        const { products } = req.body
        const objectIds = products.map(val => new ObjectId(val._id));
    
        await productModel.updateMany({
          _id: { $in: objectIds }},{ $set:{is_deleted: true }}
        ); 

        return res.status(200).json({message:"Successfully deleted products" , error: false})  
     } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

// const uploadImages = async (req, res) => {
//     try {
//         const result = validationResult(req);
//         if (result.errors.length > 0) {
//             return res.status(200).json({
//                 error: true,
//                 title: result.errors[0].msg,
//                 errors: result,
//             });
//         }
//         const {images,names} = req.body
//         if (!Array.isArray(images) || !Array.isArray(names) || images.length !== names.length) {
//             return res.status(200).json({
//                 error: true,
//                 title: "Images and names must be arrays of equal length",
//             });
//         }
//         for (let i = 0; i < names.length; i++) {
//             const name = names[i];
//             const fileSKU = name.split('.')[0];
//             const product = await productModel.findOne({ SKU: fileSKU });
 
//             if (product) {
//                 const filename = `${product.product_name}q-${product.quantity}${product.unit}.jpeg`;
//                 const imageUrl = await base64Upload('products', filename, 'image/jpeg', images[i]);
//                 await productModel.findByIdAndUpdate(product._id, { product_image: imageUrl });
//             }
//         }
//         return res.status(200).json({message:"Suucessfully uploaded product images",error:false})
//     } catch (error) {
//         return res.status(200).json({
//             title: error.message || "Something went wrong",
//             error: true,
//         });
//     }
// }

const uploadImages = async (req, res) => {
    try {
      const result = validationResult(req);
      if (result.errors.length > 0) {
        return res.status(200).json({
          error: true,
          title: result.errors[0].msg,
          errors: result,
        });
      }
  
      const { files } = req.body;
  
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(200).json({
          error: true,
          message: "No files uploaded",
        });
      }
  
      const notUploaded = [];
  
      for (const file of files) {
        const name = file.name;
        const image = file.image;
        const fileSKU = name.split('.')[0];
  
        const product = await productModel.findOne({ SKU: fileSKU });
  
        if (product) {
          try {
            const filename = `${product.product_name}q-${product.quantity}${product.unit}.jpeg`;
            const imageUrl = await base64Upload('products', filename, 'image/jpeg', image);
            await productModel.findByIdAndUpdate(product._id, { product_image: imageUrl });
            await offer.updateMany(
              {"product_details.product_id": product._id},
              {$set: {"product_details.$.product_image": imageUrl}}
            );
          } catch (err) {
            notUploaded.push({
              SKU: fileSKU,
              reason: `Upload failed: ${err.message || 'Unknown error'}`,
              product_id: product._id,
              product_name: product.product_name
            });
          }
        } else {
          notUploaded.push({
            SKU: fileSKU,
            reason: "No matching product found"
          });
        }
      }
  
      if (notUploaded.length > 0) {
        console.log("⛔️ The following images were not uploaded correctly:");
        console.table(notUploaded);
      } else {
        console.log("✅ All images uploaded successfully.");
      }
  
      return res.status(200).json({
        message: "Processed product images",
        error: false,
        totalProcessed: files.length,
        totalNotUploaded: notUploaded.length
      });
  
    } catch (error) {
      console.error("❌ Upload error:", error);
      return res.status(200).json({
        message: error.message || "Something went wrong",
        error: true,
      });
    }
  };

const fetchCompanyProducts = async (req, res) => {
    try {
        const result = validationResult(req);
        if (result.errors.length > 0) {
            return res.status(200).json({
                error: true,
                title: result.errors[0].msg,
                errors: result,
            });
        } 
        const { brand_id } = req.query
        const productData = await productModel.find({is_deleted:false, is_hidden: false, company_id: brand_id})
        .populate("category_id", ["category"])
        .sort({createdAt:1})
        return res.status(200).json({message:'Successfully fetched offers', error: false, productData})
    } catch (error) {
        return res.status(200).json({
            message: error.message || "Something went wrong",
            error: true,
        });
    }
}

const downloadProducts = async (req, res) => {
  try {
    const result = validationResult(req);
    if (result.errors.length > 0) {
      return res.status(200).json({
        error: true,
        title: result.errors[0].msg,
        errors: result,
      });
    }

    // Get all non-deleted products
    const products = await productModel
      .find({ is_deleted: false, is_hidden: false })
      .populate("company_id", "company_name")
      .populate("category_id", "category")
      .sort({ createdAt: 1 });

    if (!products.length) {
      return res.status(200).json({
        error: true,
        title: "No products found to export",
      });
    }

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Products");

    // Define columns
    worksheet.columns = [
      { header: "Name", key: "name", width: 30 },
      { header: "Image", key: "image", width: 40 },
      { header: "Description", key: "description", width: 40 },
      { header: "SKU", key: "sku", width: 20 },
      { header: "Category", key: "category", width: 20 },
      { header: "Sub Category", key: "subcategory", width: 20 },
      { header: "Brand", key: "brand", width: 25 },
      { header: "Selling Price", key: "selling_price", width: 15 },
      { header: "Quantity", key: "quantity", width: 15 },
      { header: "Unit", key: "unit", width: 15 },
    ];

    // Add rows
    products.forEach((p) => {
      worksheet.addRow({
        name: p.product_name || "",
        image: p.product_image,
        description: p.product_desc || "",
        sku: p.SKU || "",
        category: p.category_id?.category || "",
        subcategory: p.subcategory || "",
        brand: p.company_id?.company_name || "",
        selling_price: p.price || "",
        quantity: p.quantity || "",
        unit: p.unit || "",
      });
    });

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF333333" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Set response headers
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=products.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    // Stream the workbook to the client
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(200).json({
      message: error.message || "Something went wrong while exporting",
      error: true,
    });
  }
};

const getLatestSKU = async (req, res) => {
  try {
    // Consider ALL products (including soft-deleted) so max+1 can never collide
    // with an existing record's SKU. Pre-filter to purely numeric SKU strings
    // so $toInt can't throw on values like "ABC-1" or empty strings.
    const result = await productModel.aggregate([
      { $match: { SKU: { $regex: /^\d+$/ } } },
      { $addFields: { skuNum: { $toLong: "$SKU" } } },
      { $sort: { skuNum: -1 } },
      { $limit: 1 },
    ]);

    const nextSKU =
      result.length > 0 && !isNaN(result[0].skuNum)
        ? String(result[0].skuNum + 1)
        : null;

    return res.status(200).json({
      error: false,
      nextSKU,
      currentSKU: result[0]?.SKU || null,
    });
  } catch (error) {
    return res.status(200).json({
      error: true,
      message: error.message,
    });
  }
};


module.exports = {
    productsListing,
    addProduct,
    addProductForScanOrder,
    deleteProduct,
    editProduct,
    productsListingAdmin,
    getAddProductModalData,
    uploadCSV,
    downloadCsv,
    HideUnhideProducts,
    hideProduct,
    deleteProducts,
    uploadImages,
    fetchCompanyProducts,
    downloadProducts,
    getLatestSKU,
};