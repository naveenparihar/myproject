var mongoose = require('mongoose');
passportLocalMongoose = require('passport-local-mongoose');

transactionSchema = new mongoose.Schema( {
    username: String,
    credit: {
        type: Number, 
        default: 0
    },
    phone: Number,
    date: {
        type: Date,
        default: Date.now
    },
    creditBy: String
})

module.exports = mongoose.model("Transaction", transactionSchema)