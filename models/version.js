var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var versionSchema = new Schema({
    ios:String,
    android:String,
    check:Boolean
},
    {
        timestamps: true
    });

module.exports = mongoose.model('version', versionSchema);