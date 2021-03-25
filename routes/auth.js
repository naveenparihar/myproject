var express  = require('express');
	router =  express.Router(),
	User= require("../models/user"),
    passport = require('passport'),
    localStrategy = require('passport-local'),
    passportLocalMongoose  = require('passport-local-mongoose');

//------------ POST ROUTE TO LOGIN A USER------//
router.post("/login",passport.authenticate('user', {
    successRedirect: '/game',
    failureRedirect: '/'
}), function(req, res){
});


//---------- POST ROUTE TO LOGOUT A USER -------------//
router.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
})

//---------- MIDDLEWARE -------------//
function isLoggedin(req, res, next) {
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
}
module.exports = router;