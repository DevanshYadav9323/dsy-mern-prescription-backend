const mongoose = require("mongoose")

const maintainanceSchema  = new mongoose.Schema({
   on_maintainance:Boolean,
}, {timestamps: true})

const maintainance = mongoose.model('maintainance',maintainanceSchema)

module.exports = {maintainance}