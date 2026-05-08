var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    customer_id:{
        type:Schema.Types.ObjectId,
        ref:'customer'
    },
    query:String,
    seen:{
        type:Schema.Types.Boolean,
        default:false
    }
    },
    {
        timestamps: true
    });

module.exports = mongoose.model('query', schema);