var mongoose = require('mongoose'),
passportLocalMongoose  = require('passport-local-mongoose');

roomSchema = new mongoose.Schema({
    roomName: Number,
    bootAmount: Number,
    chaalLimit: Number,
    potLimit: Number,
    blindLimit: Number,
    minBuyIn: Number
});

module.exports = mongoose.model("Room", roomSchema);