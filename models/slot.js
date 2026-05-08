var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    shop_id:{
        type:Schema.Types.ObjectId,
        ref:'shop'
    },
    slots:[{
        start_time:Date,
        end_time:Date
    }]
},
    {
        timestamps: true
    });

module.exports = mongoose.model('slot', schema);