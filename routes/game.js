var express  = require('express'),
    server = require('http').Server(express),
    io = require('socket.io')(server),
    router =  express.Router(),
    mongoose = require("mongoose"),
    rooms =  require("../models/rooms"),
    private = require("../models/privateRoom"),
    admin = require("../models/admin"),
    user = require("../models/user"),
    newid = require("uniqid");
    playerCount = 0;

    class table {
        constructor(tableId,tableName) {
            this.tableId = tableId;
            this.tableName = tableName;
            this.players = new Array();
            this.addPlayer = function (playerId) {
                    this.players.push(playerId);
            };
            this.addActivePlayer = function (playerId) {
                this.activePlayers.push(playerId);
            };
            this.removePlayer = function (playerId) {
                console.log(`game ${playerId}`)
                this.players.pop(playerId);
        };
        }
    }
    var tableArray =  new Array(),
    pvtTableArray =  new Array(),
    tableId, pvtTableId;
//---------------Game Menu---------------//
router.get("/", isLoggedin, function(req,res) {
    rooms.find({}, function(err,data){
        if(err)
            console.log(err);
        else {
            data.sort(function(a,b){
                return a.roomName - b.roomName;
            })
            res.render("game/gameHome",{
                rooms:data,
                notAllowed: false
            })
        }
    })
});
router.get("/gameroom", isLoggedin, function(req,res) {
    rooms.find({}, function(err,data){
        if(err)
            console.log(err);
        else {
            data.sort(function(a,b){
                return a.roomName - b.roomName;
            })
            res.render("game/gameroom",{
                rooms:data,
                notAllowed: false
            })
        }
    })
});
router.get("/private", isLoggedin, function(req,res) {
    rooms.find({}, function(err,data){
        if(err)
            console.log(err);
        else {
            data.sort(function(a,b){
                return a.roomName - b.roomName;
            })
            res.render("game/private",{
                rooms:data,
                notAllowed: false
            })
        }
    })
});

//---------------Private Table-------------//
router.get("/private/:roomid", isLoggedin, function(req,res) {
    let notAllowed = false;
    pvtTableId = req.query.tableid; 
    console.log(pvtTableId);
    rooms.find({roomName: req.params.roomid}, function(err,data) {
        user.find({}, function(err,allUsers) {
            console.log()
            user.find({username: req.user.username}, function(err,userdata) {
            if(err)
                console.log(err);
            else {
                if(userdata[0].typeOfUser == 'user')
                {
                    if(userdata[0].credits < data[0].minBuyIn) {
                        notAllowed = true;
                        console.log("low balance")
                    }
                    if(notAllowed) {
                        console.log("getting here")
                        rooms.find({}, function(err,data){
                            if(err)
                                console.log(err);
                            else {
                                data.sort(function(a,b){
                                    return a.roomName - b.roomName;
                                })
                                res.render("game/gameHome",{
                                    rooms:data,
                                    notAllowed: true
                                })
                            }
                        })
                    }
                    else {
                        if(pvtTableId){
                            console.log("table id definded")
                            tableFlag = 0,pos = 0;
                            for( let i = 0; i< pvtTableArray.length; i++) {
                                if(pvtTableArray[i].tableId == pvtTableId && pvtTableArray[i].players.length < 1) {
                                    tableFlag = 1;
                                    pos = i;
                                    break;
                                }
                            }
                            if(tableFlag) {
                                let flag = 0;
                                    console.log("\n------------------------Into if")
                                    for(let j = 0; j<pvtTableArray[pos].players.length; j++) {
                                        if(pvtTableArray[pos].players[j] === req.user.username) {
                                            flag = 0;
                                            break;
                                        }
                                    }
                                    if(!flag)
                                    pvtTableArray[pos].addPlayer(req.user.username);
                            }
                            // else{
                            //     rooms.find({}, function(err,data){
                            //         if(err)
                            //             console.log(err);
                            //         else {
                            //             data.sort(function(a,b){
                            //                 return a.roomName - b.roomName;
                            //             })
                            //             res.render("game/gameHome",{
                            //                 rooms:data,
                            //                 notAllowed: true
                            //             })
                            //         }
                            //     })
                            // }
                        }
                        else{
                            pvtTableId =  newid();
                            newTable = new table(pvtTableId,req.params.roomid);
                            newTable.addPlayer(req.user.username);
                            pvtTableArray.push(newTable);
                            console.log("pvt table"); 
                        }  
                        res.render("game/privateTable",{
                                    room: data[0],
                                    table: pvtTableId,
                                    allUser: allUsers
                        });
                    }
                }else{
                    admin.find({username: req.user.username}, function(err,userdata) {
                        if(err)
                            console.log(err);
                        else {
                            if(userdata[0].credits < data[0].minBuyIn) {
                                notAllowed = true;
                            }
                            if(notAllowed) {
                                console.log("getting here")
                                rooms.find({}, function(err,data){
                                    if(err)
                                        console.log(err);
                                    else {
                                        data.sort(function(a,b){
                                            return a.roomName - b.roomName;
                                        })
                                        res.render("game/gameHome",{
                                            private:data,
                                            notAllowed: true
                                        })
                                    }
                                })
                            }
                            else {
                                if(pvtTableId){
                                    tableFlag = 0,pos = 0;
                                    for( let i = 0; i< pvtTableArray.length; i++) {
                                        if(pvtTableArray[i].tableId == pvtTableId && pvtTableArray[i].players.length < 1) {
                                            tableFlag = 1;
                                            pos = i;
                                            break;
                                        }
                                    }
                                    if(tableFlag) {
                                        let flag = 0;
                                            console.log("\n------------------------Into if")
                                            for(let j = 0; j<tableArray[pos].players.length; j++) {
                                                if(tableArray[pos].players[j] === req.user.username) {
                                                    flag = 1;
                                                    break;
                                                }
                                            }
                                            if(!flag)
                                                tableArray[pos].addPlayer(req.user.username);
                                                res.render("game/gameTable",{
                                                    room: data[0],
                                                    table: pvtTableId,
                                                    allUser: allUsers
                                                });            
                                    }
                                    else{
                                        rooms.find({}, function(err,data){
                                            if(err)
                                                console.log(err);
                                            else {
                                                data.sort(function(a,b){
                                                    return a.roomName - b.roomName;
                                                })
                                                res.render("game/gameHome",{
                                                    rooms:data,
                                                    notAllowed: true
                                                })
                                            }
                                        })
                                    }
                                } 
                                else{ 
                                    if(pvtTableArray.length === 0) {
                                        pvtTableId =  newid();
                                        newTable = new table(pvtTableId, req.params.roomid);
                                        newTable.addPlayer(req.user.username);
                                        pvtTableArray.push(newTable);
                                    }
                                    else {
                                        tableFlag = 0,pos = 0;
                                        for( let i = 0; i< tableArray.length; i++) {
                                            if(pvtTableArray[i].tableName == req.params.roomid && pvtTableArray[i].players.length < 5) {
                                                tableFlag = 1;
                                                pos = i;
                                                break;
                                            }
                                        }
                                        if(tableFlag) {
                                            pvtTableId = pvtTableArray[pos].tableId;
                                            if(pvtTableArray[pos].players.length == 0){
                                                pvtTableArray[pos].addPlayer('sadik');
                                            }
                                            let flag = 0;
                                                console.log("\n------------------------Into if")
                                                for(let j = 0; j<pvtTableArray[pos].players.length; j++) {
                                                    if(pvtTableArray[pos].players[j] === req.user.username) {
                                                        flag = 1;
                                                        break;
                                                    }
                                                }
                                                if(!flag)
                                                pvtTableArray[pos].addPlayer(req.user.username);
                                        }
                                        else {
                                            console.log("\n------------------------Into else")
                                            pvtTableId =  newid();
                                            newTable = new table(pvtTableId, req.params.roomid);
                                            newTable.addPlayer(req.user.username);
                                            pvtTableArray.push(newTable);
                                        }
                                    }  
                                }
                                 
                            }
                        }
                    })
                }
            }
        })
    })
});
});
router.get("/howtoplay", function(req, res) {
    res.render("game/howtoplay");
})
router.post("/private", function(req,res) {
    seed = new privateRoom({
        bootAmount: req.body.bootAmount
    })
    privateRoom.create(seed, function(err,data){
        id =  data._id
        if(err)
          {  console.log(err);
            res.render("game/private", {
            newuserAdded : false,
            userAdded: req.body.bootAmount,
            postQuery : 1
            })
        }
            
        else
        { console.log("Room created!");
        res.render("game/private", {
            newuserAdded : true,
            userAdded: id,
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


//---------------Game Matchmaking---------//
router.get("/:roomid",isLoggedin, function(req,res) {
    console.log("req data " + req.query.tableid);
   if(req.params.roomid <= 5 && req.params.roomid >= 1) {let notAllowed = false;
    rooms.find({roomName: req.params.roomid}, function(err,data) {
        user.find({}, function(err,allUsers) {
            // console.log(allUsers)
            user.find({username: req.user.username}, function(err,userdata) {
            if(err)
                console.log(err);
            else {
                if(userdata.length)
                {
                    console.log(userdata[0].credits, data[0].minBuyIn)
                    if(userdata[0].credits < data[0].minBuyIn) {
                        notAllowed = true;
                        console.log("low balance")
                    }
                    if(notAllowed) {
                        console.log("getting here")
                        rooms.find({}, function(err,data){
                            if(err)
                                console.log(err);
                            else {
                                data.sort(function(a,b){
                                    return a.roomName - b.roomName;
                                })
                                res.render("game/gameHome",{
                                    rooms:data,
                                    notAllowed: true
                                })
                            }
                        })
                    }
                    else {
                            if(tableArray.length === 0) {
                                tableId =  newid();
                                newTable = new table(tableId,req.params.roomid);
                                newTable.addPlayer(req.user.username);
                                newTable.addPlayer('sadik');
                                tableArray.push(newTable);
                                res.render("game/gameTable",{
                                    room: data[0],
                                    table: tableId,
                                    allUser: allUsers
                                });
                            }
                            else {
                                tableFlag = 0,pos = 0;
                                for( let i = 0; i< tableArray.length; i++) {
                                    if(tableArray[i].players.length > 1){
                                        for(let k = 0; k<tableArray[i].players.length; k++){
                                            if(tableArray[i].players[k] == req.user.username){
                                                tableArray[i].players.splice(k, 1); 
                                            }
                                        }
                                    }
                                    if(tableArray[i].tableName == req.params.roomid && tableArray[i].players.length < 5) {
                                        tableFlag = 1;
                                        pos = i;
                                    }
                                }
                                if(tableFlag) {
                                    tableId = tableArray[pos].tableId;
                                    if(tableArray[pos].players.length == 0){
                                        tableArray[pos].addPlayer('sadik');
                                    }
                                    let flag = 0;
                                        console.log("\n------------------------Into if")
                                        for(let j = 0; j<tableArray[pos].players.length; j++) {
                                            if(tableArray[pos].players[j] === req.user.username) {
                                                flag = 1;
                                                break;
                                            }
                                        }
                                        if(!flag){
                                            console.log(tableArray[pos].players)
                                            tableArray[pos].addPlayer(req.user.username);
                                            console.log(tableArray[pos].players, tableId, data.roomName)
                                            res.render("game/gameTable",{
                                                room: data[0],
                                                table: tableId,
                                                allUser: allUsers
                                            });
                                        }
                                }
                                else {
                                    console.log("\n------------------------Into else")
                                    tableId =  newid();
                                    newTable = new table(tableId,req.params.roomid);
                                    newTable.addPlayer(req.user.username);
                                    newTable.addPlayer('sadik');
                                    tableArray.push(newTable);
                                    res.render("game/gameTable",{
                                        room: data[0],
                                        table: tableId,
                                        allUser: allUsers
                                    });
                                }
                            } 
                    }
                }else{
                    admin.find({username: req.user.username}, function(err,userdata) {
                        if(err)
                            console.log(err);
                        else {
                            if(userdata[0].credits < data[0].minBuyIn) {
                                notAllowed = true;
                            }
                            if(notAllowed) {
                                console.log("getting here")
                                rooms.find({}, function(err,data){
                                    if(err)
                                        console.log(err);
                                    else {
                                        data.sort(function(a,b){
                                            return a.roomName - b.roomName;
                                        })
                                        res.render("game/gameHome",{
                                            private:data,
                                            notAllowed: true
                                        })
                                    }
                                })
                            }
                            else {
                                    if(tableArray.length === 0) {
                                        tableId =  newid();
                                        newTable = new table(tableId, req.params.roomid);
                                        newTable.addPlayer(req.user.username);
                                        newTable.addPlayer('sadik');
                                        tableArray.push(newTable);
                                    }
                                    else {
                                        tableFlag = 0,pos = 0;
                                        for( let i = 0; i< tableArray.length; i++) {
                                            if(tableArray[i].tableName == req.params.roomid && tableArray[i].players.length < 5) {
                                                tableFlag = 1;
                                                pos = i;
                                                break;
                                            }
                                        }
                                        if(tableFlag) {
                                            tableId = tableArray[pos].tableId;
                                            if(tableArray[pos].players.length == 0){
                                                tableArray[pos].addPlayer('sadik');
                                            }
                                            let flag = 0;
                                                console.log("\n------------------------Into if")
                                                for(let j = 0; j<tableArray[pos].players.length; j++) {
                                                    if(tableArray[pos].players[j] === req.user.username) {
                                                        flag = 1;
                                                        break;
                                                    }
                                                }
                                                if(!flag)
                                                    tableArray[pos].addPlayer(req.user.username);
                                        }
                                        else {
                                            console.log("\n------------------------Into else")
                                            tableId =  newid();
                                            newTable = new table(tableId, req.params.roomid);
                                            newTable.addPlayer(req.user.username);
                                            newTable.addPlayer('sadik');
                                            tableArray.push(newTable);
                                        }
                                    }  
                                    res.render("game/gameTable",{
                                        room: data[0],
                                        table: tableId,
                                        allUser: allUsers
                                    });
                                 
                            }
                        }
                    })
                }
            }
        })
    })
});}
else{
    res.render("game/gameHome",{
        notAllowed: true
    })
}
});


function clearArray(array) {
    while(array.length)
        array.pop();
}
function fetchRoom(tableID) {
    for(let i=0;i<tableArray.length;i++)
       { 
           if(tableArray[i].tableId == tableID)
           {
                currentRoom = tableArray[i];
                return currentRoom;
    }
    }
}
function fetchPvtRoom(tableID) {
    for(let i=0;i<pvtTableArray.length;i++)
       {
            if(pvtTableArray[i].tableId == tableID)
            {
                currentRoom = pvtTableArray[i];
                return currentRoom;
        }
    }
}
//---------- MIDDLEWARE -------------//
function isLoggedin(req, res, next) {
    if(req.user) {
      next();
    } else {
    res.redirect('/');
    }
}
module.exports.router = router;
module.exports.tableArray = tableArray;
module.exports.pvtTableArray = pvtTableArray;
module.exports.fetchRoom = fetchRoom;
module.exports.fetchPvtRoom = fetchPvtRoom;