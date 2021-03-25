var mongoose = require('mongoose');
passportLocalMongoose = require('passport-local-mongoose');

creditSchema =  new mongoose.Schema({
    username : String,
    credits : {
            type: Number,
            default : 0
    },
    date : {
            type : Date,
            default : Date.now
    },
    phone : Number
})

module.exports = mongoose.model("Credit",creditSchema)