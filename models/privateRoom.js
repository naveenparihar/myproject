var mongoose = require('mongoose'),
passportLocalMongoose  = require('passport-local-mongoose');

roomSchema = new mongoose.Schema({
    bootAmount: Number
});

module.exports = mongoose.model("privateroom", roomSchema);