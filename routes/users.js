var express  = require('express');
    router =  express.Router(),
    User = require("../models/user"),
    mongoose = require("mongoose"),
    User= require("../models/user"),
    privateRoom = require("../models/privateRoom");

//------------------- USER PROFILE SHOW------------------//
router.get("/",function(req,res) {
    res.render("/game",{
        user : req.user
    })
})

router.get('/users', async (req,res) => {
    try{
        console.log(req.userId)
        var users = await User.find({})
        res.send(users)
    }
   catch(error){
       res.sendStatus(500);
   }
})
router.get("/private", function(req, res) {
    res.render("game/private", {
                        newuserAdded : true,
                        userAdded: req.body.username,
                        postQuery: 0
                    })
});

router.post("/private", function(req,res) {
    seed = new privateRoom({
        bootAmount: req.body.bootAmount
    })
    privateRoom.create(seed, function(err,data){
        if(err)
          {  console.log(err);
            res.render("game/private", {
            newuserAdded : false,
            userAdded: req.body.username,
            postQuery : 1
            })
        }
            
        else
        { console.log("Room created!");
           res.render("game/private", {
            newuserAdded : true,
            userAdded: req.body.username,
            postQuery : 1
            })
        }
    })
    // User.register(new User({
	// 	username: req.body.username,
	// 	phone: req.body.phone
	// }), req.body.password, function(err, ans) {
	// 			if(err) {
	// 				console.log(err);
	// 				res.render("admin/adduser", {
    //                     newuserAdded : false,
    //                     userAdded: req.body.username,
    //                     postQuery : 1
    //                 })
	// 			}
	// 			else {
	// 				res.render("admin/adduser", {
    //                     newuserAdded : true,
    //                     userAdded: req.body.username,
    //                     postQuery : 1
    //                 })
	// 			}
    // })
})

router.get("/:id",function(req,res) {
    res.send("getting here");
})

module.exports = router;