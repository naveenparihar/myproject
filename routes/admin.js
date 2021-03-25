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
    res.render("admin/login");
});

//---------------------ADD A USER--------------------------------//
router.get("/adduser", function(req, res) {
    res.render("admin/adduser", {
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
					res.render("admin/adduser", {
                        newuserAdded : false,
                        userAdded: req.body.username,
                        postQuery : 1
                    })
				}
				else {
					res.render("admin/adduser", {
                        newuserAdded : true,
                        userAdded: req.body.username,
                        postQuery : 1
                    })
				}
    })
})

//---------------------ADD A SUB ADMIN--------------------------------//
router.get("/addsubadmin", function(req, res) {
    res.render("admin/addsubadmin", {
                        newuserAdded : true,
                        userAdded: req.body.username,
                        postQuery: 0
                    })
});

router.post("/addsubadmin", function(req,res) {
    SubAdmin.register(new SubAdmin({
		username: req.body.username,
		phone: req.body.phone
	}), req.body.password, function(err, ans) {
				if(err) {
					console.log(err);
					res.render("admin/addsubadmin", {
                        newuserAdded : false,
                        userAdded: req.body.username,
                        postQuery : 1
                    })
				}
				else {
					res.render("admin/addsubadmin", {
                        newuserAdded : true,
                        userAdded: req.body.username,
                        postQuery : 1
                    })
				}
    })
})

//---------------------ADD USER CREDITS --------------------------------//
router.get("/credits", function(req, res) {
    res.render("admin/credits" ,{
        errormessage : ''
      })
});

router.post("/credits", function(req, res) {
    User.findOneAndUpdate({username: req.body.username }, {$inc :{ credits : req.body.credits}}, {new: true}, function(err, data) {
                if(err) {
                    console.log(err);
                    res.render("admin/credits" ,{
                        errormessage: "Database connection error!"
                      })
                }
                else {
                    if(data !== null) {
                        transaction.create({
                                credit: req.body.credits, 
                                username: req.body.username, 
                                phone: req.body.phone,
                                date: req.body.date,
                                creditBy: req.user.username
                            }, function(err, msg) {
                            if(err) {
                                res.render("admin/credits" ,{
                                    errormessage: "Database connection error!"
                                })
                            }
                            else {
                                res.render("admin/credits" ,{
                                errormessage: "Credits updated succesfully"
                                })
                            }
                        })
                    } else  {
                        res.render("admin/credits" ,{
                            errormessage: "No such user exists, please re-check."
                        })
                    }
                }
    })
})
//---------------------ADD SUB ADMIN CREDITS --------------------------------//
router.get("/subcredits", function(req, res) {
    res.render("admin/subcredits" ,{
        errormessage : ''
      })
});

router.post("/subcredits", function(req, res) {
    SubAdmin.findOneAndUpdate({username: req.body.username }, {$inc :{ credits : req.body.credits}}, {new: true}, function(err, data) {
                if(err) {
                    console.log(err);
                    res.render("admin/subcredits" ,{
                        errormessage: "Database connection error!"
                      })
                }
                else {
                    if(data !== null) {
                        transaction.create({
                                credit: req.body.credits, 
                                username: req.body.username, 
                                phone: req.body.phone,
                                date: req.body.date,
                                creditBy: req.user.username
                            }, function(err, msg) {
                            if(err) {
                                res.render("admin/subcredits" ,{
                                    errormessage: "Database connection error!"
                                })
                            }
                            else {
                                res.render("admin/subcredits" ,{
                                errormessage: "Credits updated succesfully"
                                })
                            }
                        })
                    } else  {
                        res.render("admin/subcredits" ,{
                            errormessage: "No such user exists, please re-check."
                        })
                    }
                }
    })
})

//------------------GET ROUTE FOR TRANSACTION------------------//
router.get("/transactions",  isLoggedin,isAdmin,function(req, res) {
    transaction.find({}, function(err, data) {
        if(err) {
            console.log(err);
        }
        else {
            //console.log(data);
            res.render("admin/transactions.ejs", {
                data: data
            })
        }
    })
})

//----------------to main admin panel----------------//
router.get("/adminpanel",isLoggedin, function(req,res) {
    admin.find({username:req.user.username},function(err,data) {
        if(err) {
            console.log("Admin error"+err);
            res.redirect("/admin/login")
        }
        else {
            res.render("admin/admin");
        }
        console.log(req.user);
    })
})

//-----------------------change password---------------//
router.get("/changepass",isLoggedin, function(req, res) {
    res.render("admin/changepass");
})

//------------------------change user-------------//
router.get("/changeuser",isLoggedin, function(req, res) {
    res.render("admin/changeuser");
})
router.post("/changeuser",function(req, res) {
    console.log("==============================================")
    
    admin.findOneAndUpdate({username: req.user.username},{username: req.body.username}, function(err, data) {
        if(err)
            console.log(err);
        else {
            admin.find({username:req.body.username}, function(err, newData){
                if(err)
                    console.log(err);
                else {
                    req.session.passport.user = newData[0].username;
                    passport.serializeUser(admin.serializeUser());
                    passport.deserializeUser(admin.deserializeUser());
                }
                console.log("***********************************************")
            })
            
            res.redirect("/admin")
        }
    })
})

//------------ POST ROUTE TO LOGIN ADMIN------//
router.post("/login",passport.authenticate('admin', {
    successRedirect: '/admin/adminpanel',
    failureRedirect: '/admin'
}), function(req, res){
});

//---------- POST ROUTE TO CREATE A USER -------------//
router.post("/register", function(req,res) {
    admin.register(new admin({username: req.body.username}), req.body.password, function(err, ans) {
				if(err) {
					console.log(err);
					res.send('Error aa gayi');
				}
				else {
					// Authentication via passport
					passport.authenticate('admin')(req, res, function(){
						res.send("Registered!");
				});
        }
	});
});

// --------------------FETCH USERS------------------- //
router.get('/users', async (req,res) => {
    User.find({}, function(err, data) {
        if(err) {
            console.log(err);
        }
        else {
            //console.log(data);
            res.render("admin/allusers.ejs", {
            data: data
            })
        }
    })
})

//---------- POST ROUTE TO LOGOUT A USER -------------//
router.get("/logout", function(req, res){
    req.logout();
    res.redirect("/admin");
})


//---------- MIDDLEWARE -------------//
function isLoggedin(req, res, next) {
    if(req.isAuthenticated()) {
      return next();
    }
    res.redirect('/admin');
}

function isAdmin(req,res, next) {
    admin.find({username:req.user.username},function(err,data) {
        if(data.length === 0) {
            console.log("Admin error"+err);
            res.redirect("/game");
        }
        else {
            return next();
        }
        console.log(req.user);
    })
}
module.exports =  router;