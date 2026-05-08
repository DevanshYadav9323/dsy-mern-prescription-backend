var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    company_name:{
        type:String,
        // unique:true
    },    
    company_logo:String
},
    {
        timestamps: true
    });

module.exports = mongoose.model('company', schema);