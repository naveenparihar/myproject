var express  = require('express'),
    app = express(),
	router =  express.Router(),
    admin = require("../models/admin"),
    User = require("../models/user"),
    SubAdmin = require("../models/subAdmin"),
    transaction = require('../models/transaction')
    passport = require('passport'),
    localStrategy = require('passport-local'),
    passportLocalMongoose  = require('passport-local-mongoose');



router.get("/",function(req,res) {
    res.render("subadmin/login");
});

//---------------------ADD A USER--------------------------------//
router.get("/adduser", function(req, res) {
    res.render("subadmin/adduser", {
                        newuserAdded : true,
                        userAdded: req.body.username,
                        postQuery: 0
                    })
});

router.post("/adduser", function(req,res) {
    User.register(new User({
		username: req.body.username,
        phone: req.body.phone,
        createBy: req.user.username
	}), req.body.password, function(err, ans) {
				if(err) {
					console.log(err);
					res.render("subadmin/adduser", {
                        newuserAdded : false,
                        userAdded: req.body.username,
                        postQuery : 1
                    })
				}
				else {
					res.render("subadmin/adduser", {
                        newuserAdded : true,
                        userAdded: req.body.username,
                        postQuery : 1
                    })
				}
    })
})

//---------------------ADD CREDITS --------------------------------//
router.get("/credits", function(req, res) {
    res.render("subadmin/credits" ,{
        errormessage : ''
      })
});

router.post("/credits", function(req, res) {
    
    SubAdmin.find({username: req.user.username}, function(err,userdata){
        let notAllowed = false;
        if(err)
        console.log(err);
        else {
                console.log(userdata[0].credits)
                if(userdata[0].credits < req.body.credits) {
                    notAllowed = true;
                    console.log("low balance")
                }
                if(notAllowed) {
                    console.log("getting here")
                    res.render("subadmin/credits" ,{
                        errormessage: "Insufficient balance, please buy credits."
                    })
                }else{
                    User.findOneAndUpdate({username: req.body.username, createBy:req.user.username }, {$inc :{ credits : req.body.credits}}, {new: true}, function(err, data) {
                        if(err) {
                            console.log(err);
                            res.render("subadmin/credits" ,{
                                errormessage: "Database connection error!"
                              })
                        }
                        else {
                            if(data !== null) {
                                let balance = -req.body.credits
                                SubAdmin.findOneAndUpdate({username: req.user.username}, {$inc :{ credits : balance}}, {new: true}, function(err) {
                                    if(err) {
                                        console.log(err);
                                        res.render("subadmin/credits" ,{
                                            errormessage: "Database connection error!"
                                          })
                                    }
                                })
                                transaction.create({
                                        credit: req.body.credits, 
                                        username: req.body.username, 
                                        phone: req.body.phone,
                                        date: req.body.date,
                                        creditBy: req.user.username
                                    }, function(err, msg) {
                                    if(err) {
                                        res.render("subadmin/credits" ,{
                                            errormessage: "Database connection error!"
                                        })
                                    }
                                    else {
                                        res.render("subadmin/credits" ,{
                                        errormessage: "Credits updated succesfully"
                                        })
                                    }
                                })
                            } else  {
                                res.render("subadmin/credits" ,{
                                    errormessage: "No such user exists, please re-check."
                                })
                            }
                        }
            })
                }
            }
    })
})
//------------------GET ROUTE FOR TRANSACTION------------------//
router.get("/transactions",  isLoggedin,isAdmin,function(req, res) {
    transaction.find({creditBy:req.user.username}, function(err, data) {
        if(err) {
            console.log(err);
        }
        else {
            //console.log(data);
            res.render("subadmin/transactions.ejs", {
            data: data
            })
        }
    })
})

//----------------to main admin panel----------------//
router.get("/adminpanel",isLoggedin, function(req,res) {
    SubAdmin.find({username:req.user.username},function(err,data) {
        if(err) {
            console.log("Admin error"+err);
            res.redirect("/subadmin/login")
        }
        else {
            res.render("subadmin/admin");
        }
        console.log(req.user);
    })
})

//-----------------------change password---------------//
router.get("/changepass",isLoggedin, function(req, res) {
    res.render("subadmin/changepass");
})
router.post("/changepass",function(req, res) {
    console.log(req.body.oldpass, req.body.newpass);
    
    SubAdmin.findOneAndUpdate({username: req.user.username,password: req.body.oldpass},{password: req.body.newpass}, function(err, data) {
        if(err)
            console.log(err);
        else {
            SubAdmin.find({username:req.user.username}, function(err, newData){
                if(err)
                    console.log(err);
                else {
                    req.session.passport.user = newData[0].password;
                    passport.serializeUser(SubAdmin.serializeUser());
                    passport.deserializeUser(SubAdmin.deserializeUser());
                }
                console.log("***********************************************")
            })
            
            res.redirect("/subadmin")
        }
    })
})

//------------------------change user-------------//
router.get("/changeuser",isLoggedin, function(req, res) {
    res.render("subadmin/changeuser");
})
router.post("/changeuser",function(req, res) {
    console.log("==============================================")
    
    SubAdmin.findOneAndUpdate({username: req.user.username},{username: req.body.username}, function(err, data) {
        if(err)
            console.log(err);
        else {
            SubAdmin.find({username:req.body.username}, function(err, newData){
                if(err)
                    console.log(err);
                else {
                    req.session.passport.user = newData[0].username;
                    passport.serializeUser(SubAdmin.serializeUser());
                    passport.deserializeUser(SubAdmin.deserializeUser());
                }
                console.log("***********************************************")
            })
            
            res.redirect("/subadmin")
        }
    })
})

// --------------------FETCH USERS------------------- //
router.get('/users', async (req,res) => {
    User.find({createBy:req.user.username}, function(err, data) {
        if(err) {
            console.log(err);
        }
        else {
            //console.log(data);
            res.render("subadmin/alluser.ejs", {
            data: data
            })
        }
    })
})
//------------ POST ROUTE TO LOGIN ADMIN------//
router.post("/login",passport.authenticate('subadmin', {
    successRedirect: '/subadmin/adminpanel',
    failureRedirect: '/subadmin'
}), function(req, res){
});

//---------- POST ROUTE TO LOGOUT A USER -------------//
router.get("/logout", function(req, res){
    req.logout();
    res.redirect("/subadmin");
})

//---------- MIDDLEWARE -------------//
function isLoggedin(req, res, next) {
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect('/subadmin');
}

function isAdmin(req,res, next) {
    SubAdmin.find({username:req.user.username},function(err,data) {
        if(data.length === 0) {
            console.log("Admin error"+err);
            res.redirect("/subadmin");
        }
        else {
            return next();
        }
        console.log(req.user);
    })
}
module.exports =  router;