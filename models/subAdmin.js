var mongoose = require('mongoose'),
passportLocalMongoose  = require('passport-local-mongoose');

subAdminSchema = new mongoose.Schema({
    username: String,
    password: String,
    credits: {
        type: Number,
        default: 0  
    },
    typeOfUser : {
        type: String,
        default: 'subadmin'
    }
});
subAdminSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("subadmin", subAdminSchema);