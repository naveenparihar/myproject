var express = require('express'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server),
    methodOverride = require('method-override'),
    mongoose = require('mongoose'),
    session = require('express-session'),
    MongoStore = require('connect-mongo')(session),
    passport = require('passport'),
    path = require('path'),
    localStrategy = require('passport-local'),
    passportLocalMongoose = require('passport-local-mongoose'),
    bodyParser = require('body-parser'),
    authRoute = require('./routes/auth'),
    userRoute = require('./routes/users'),
    gameRoute = require('./routes/game'),
    adminRoute = require('./routes/admin'),
    subadminRoute = require('./routes/subadmin'),
    User = require('./models/user'),
    admin = require('./models/admin'),
    subAdmin = require('./models/subAdmin'),
    card = require('./lib/card'),
    cardComparer = require('./lib/cardComparer'),
    deck = require('./lib/deck'),
    seedDb = require('./seeds.js')(),
    navigator = require('navigator');
// require('./io-handler')(io);

//----------------DATABASE CONNECTION--------------//
//mongodb://graphicstone:Harishiv8@ds149682.mlab.com:49682/teenpatti
mongoose.connect('mongodb://naveen:naveen123@ds249583.mlab.com:49583/teenpatti', { native_parser: true, useNewUrlParser: true });

//----------------BODY PARSER--------------//
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//----------------BASIC SETUP--------------//
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use(express.static('public/css'));

//----------------SESSION & AUTHENTICATION-----------//
app.use(require('express-session')({
    secret: '=N"f"_RAZ%GVeq(%4N"`d\K!<=A(#96T\+-NL;rz;&qQ-VkgSL2z38w^;#NE:}-Nt',
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}));
//Setting Passport
app.use(passport.initialize());
app.use(passport.session());
passport.use('user', new localStrategy(User.authenticate()));
passport.use('admin', new localStrategy(admin.authenticate()));
passport.use('subadmin', new localStrategy(subAdmin.authenticate()));
passport.serializeUser(function (user, done) {
    // console.log(user);
    done(null, { id: user.id, type: user.typeOfUser });
});
passport.deserializeUser(function (data, done) {
    if (data.type === 'user') {
        User.findById(data.id, function (err, user) {
            done(err, user);
        });
    } else if (data.type === 'admin') {
        admin.findById(data.id, function (err, user) {
            done(err, user);
        });
    } else {
        subAdmin.findById(data.id, function (err, user) {
            done(err, user);
        });
    }
});

//Setting user for the variable
app.use(function (req, res, next) {
    res.locals.currUser = req.user;
    next();
});


//----------------ROUTES-----------------//
app.use('/auth', authRoute);
app.use('/user', userRoute);
app.use('/game', gameRoute.router);
app.use('/admin', adminRoute);
app.use('/subadmin', subadminRoute);
//Root Directory Traversal
app.get('/', function (req, res) {
    if (req.user) {
        res.redirect('/game');
    }
    else {
        res.render('landing');
    }
});

/* ---------------------------MODULES TO CODE-----------------------------------
        + Landing Page
            -Promo Content
            -Login
        + Game Home
            -User's Basic Info
            -Transactions 
            -Games Played
        + Game Screen
            - Socket.io

        --sideshow
        --setTimeout
        --cardShow
* ----------------------------END---------------------------------------------*/

//--------------------------Socket.io--------------------------------//

var room = io.of('/game/1'),
    room2 = io.of('/game/2'),
    room3 = io.of('/game/3'),
    room4 = io.of('/game/4'),
    room5 = io.of('/game/5'),
    pvtRoom1 = io.of('/game/private/1'),
    pvtRoom2 = io.of('/game/private/2'),
    pvtRoom3 = io.of('/game/private/3'),
    pvtRoom4 = io.of('/game/private/4'),
    pvtRoom5 = io.of('/game/private/5');
// game = io.of('/game');

class client {
    constructor(userID, username, currentPocket, currUserType) {
        this.username = {
            id: userID,
            name: username
        };
        this.cards = null;
        this.blindLimit = 4;
        this.lastMove = null;
        this.totalExpend = 0;
        this.currentPocket = parseInt(currentPocket);
        this.cardStatus = false;
        this.userType = currUserType;
        this.timeOut = 0;
    }
}
class table {
    constructor(tableId, bootamount, potLimit, minBuyIn) {
        this.tableId = tableId;
        this.players = new Array();
        this.activePlayers = new Array();
        this.gameStatus = false;
        this.bootamount = bootamount;
        this.potValue = 0;
        this.chalValue = bootamount;
        this.playerChance = 0;
        this.potLimit = potLimit;
        this.tableFirstPlay = true;
        this.minBuyIn = minBuyIn;
        this.lastMove = true;
        this.playerTurn = null;
        this.addPlayer = function (playerId) {
            this.players.push(playerId);
        };
        this.addActivePlayer = function (playerId) {
            this.activePlayers.push(playerId);
        };
        this.removePlayer = function (playerId) {
            this.players.pop(playerId);
        };
    }
}

function updateUserCredit(username, newCredit, userType) {
    var retValue;
    if (userType == 'admin') {
        // console.log("user if")
        admin.findOneAndUpdate({ username: username }, { $inc: { credits: newCredit } }, { new: true }, function (err, data) {
            if (err)
                console.log(err);
            else {
                retValue = data;
                // console.log(username + " " + data.credits);
            }
        });
    }
    else {
        User.findOneAndUpdate({ username: username }, { $inc: { credits: newCredit } }, { new: true }, function (err, data) {
            // console.log("user else")
            if (err)
                console.log(err);
            else {
                retValue = data;
                // console.log(username + " " + data.credits);
            }
        });
    }
    // console.log("return " + retValue);
    return retValue;
}
function updateAdminRevenue(theAdminRevenue) {
    admin.find({}, function (err, data) {
        if (err || data.length === 0)
            console.log(err);
        else {
            admin.findOneAndUpdate({ username: data[0].username }, { $inc: { credits: theAdminRevenue } }, function (err, newdata) {
                // console.log("Admin revenue increased by " + theAdminRevenue)
                // console.log("admin credits " + newdata.credits);
            })
        }
    })
}
var tableArray = new Array(),
    pvtTableArray = new Array();
var nomove = {}, setGameBegin = {}, setSideShow = {}, total = {};
//-------------------------GAME------------------------------//
// game.on('connection', function (socket) {
//     socket.on('create', (currUsername) => {
//         socket.username = currUsername;
//         socket.join(currUsername);
//     });
// });

//-------------------------ROOM 1 --------------------------//
room.on('connection', function (socket) {
    let newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchRoom(tableID) {
        for (let i = 0; i < tableArray.length; i++)
            if (tableArray[i].tableId == tableID)
                currentRoom = tableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        // console.log("room1");
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        if (tableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            tableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < tableArray.length; i++) {
                if (tableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                // console.log("\n------------------------Into if")
                for (let j = 0; j < tableArray[pos].players.length; j++) {
                    if (tableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    tableArray[pos].addPlayer(newPlayer);
            }
            else {
                // console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                tableArray.push(newTable);
            }
        }
        // console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });
    socket.on('fulfill', function (tableID) {
        currentRoom = fetchRoom(tableID);
        room.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchRoom(tableID);
        player1 = 'sadik'
        computer1 = new client('1', 'sadik', '500000', 'user')
        if (currentRoom.players.length == 1) {
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, currUsername);
            room.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length >= 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            pushPlayerActive(currentRoom, currUsername);
            room.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            // console.log('else if 2');
            pushPlayerActive(currentRoom, currUsername);
            room.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            var newgame = 5000;
            room.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            room.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        console.log("Test Game Begin");
        if (currentRoom.players.length == 1 && currentRoom.players[0].username.name !== 'sadik') {
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, 'sadik');
            currentRoom = fetchRoom(currentRoom.tableId);
            room.in(currentRoom.tableId).emit('populate', currentRoom);
        }
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            for (let i = 0; i < currentRoom.players.length; i++) {
                if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                    var cards;
                    [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                    let flag = 0;
                    for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                        if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                            flag = 1;
                            break;
                        }
                    }
                    if (!flag)
                        currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                    currentRoom.playerChance = 0;
                    currentRoom.players[i].lastMove = null;
                    currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                    currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                    updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                    room.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                    currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                    room.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                    room.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                    currentRoom.players[i].cards = cards;
                    currentRoom.players[i].blindLimit = 4;
                    currentRoom.players[i].cardStatus = false;
                }
                else {
                    room.in(currentRoom.players[i].username.name).emit('minByIn');
                }
            }
            // console.log("total pot " + currentRoom.potValue);
            currentRoom.lastMove = true;
            currentRoom.playerChance = 0;
            currentRoom.bootamount = saveBootAmount;
            currentRoom.chalValue = currentRoom.bootamount;
            if (currentRoom.activePlayers.length === 1) {
                room.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                room.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                room.in(currentRoom.tableId).emit('card shuffle', currentRoom.tableId);
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    room.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }
    function getNextActivePlayer(tableID) {
        let table = fetchRoom(tableID);
        if (table.activePlayers.length === 1) {
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                room.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            let thePlayerIndex = table.activePlayers[table.playerChance];
            let thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    room.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    room.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchRoom(tableID);
                    if (table.activePlayers.length > 2)
                        room.in(thePlayer.username.name).emit('active side show');
                }
            }
            room.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
            if (thePlayer.username.name === 'sadik') {
                if (table.players.length >= 3 || thePlayer.blindLimit <= 0) {
                    {
                        let chance = table.playerChance;
                        // console.log(chance);
                        setTimeout(() => {
                            // console.log("player Chance " + table.playerChance)
                            if (chance >= 1) {
                                console.log("compuer show if " + table.activePlayers[0])
                                room.in(table.activePlayers[0]).emit('computer show');
                            }
                            else {
                                console.log("compuer show else " + table.activePlayers[1])
                                room.in(table.activePlayers[1]).emit('computer show');
                            }
                        }, 3000)
                    }
                }
                else if (thePlayer.blindLimit >= 1) {
                    // console.log('computer blind')
                    let chance = table.playerChance;
                    // console.log(chance);
                    setTimeout(() => {
                        if (chance >= 1) {
                            console.log(table.playerChance)
                            // console.log("compuer show if " + table.activePlayers[1])
                            room.in(table.activePlayers[0]).emit('computer blind');
                        }
                        else {
                            // console.log("compuer show else " + table.activePlayers[1])
                            room.in(table.activePlayers[1]).emit('computer blind');
                        }
                        // room.in(table.tableId).emit('computer blind');
                    }, 3000)
                }
                else {
                    // console.log('computer chaal')
                    let chance = table.playerChance;
                    // console.log(chance);
                    setTimeout(() => {
                        thePlayer.blindLimit--;
                        if (chance >= 1) {
                            // console.log("compuer show if " + table.activePlayers[1])
                            room.in(table.activePlayers[0]).emit('computer chaal');
                        }
                        else {
                            // console.log("compuer show else " + table.activePlayers[1])
                            room.in(table.activePlayers[1]).emit('computer chaal');
                        }
                        // room.in(table.tableId).emit('computer chaal');
                    }, 3000)
                }
            }
            nomove[tableID] = setTimeout(() => {
                thePlayer.timeOut = thePlayer.timeOut + 1;
                let i = table.activePlayers.indexOf(thePlayer.username.name);
                table.activePlayers.splice(i, 1);
                table.playerChance--;
                responseString = `${thePlayer.username.name} timed out.`
                room.in(table.tableId).emit('timeout', responseString);
                room.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                setTimeout(() => {
                    console.log('time out next');
                    getNextActivePlayer(table.tableId);
                }, 2000)
            }, 25000);
            table.playerChance++;
        }
    }
    function compared(tableID) {
        let table = fetchRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (let player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        return result;
    }
    function gameOver(tableID) {
        // clearTimeout(nomove[tableID])
        let table = fetchRoom(tableID);
        room.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    room.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        room.in(table.tableId).emit('declareWinner', theWinner.username.name);
        room.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue));
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        table.potValue = 0;
        let newgame = 5000;
        setTimeout(() => {
            room.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            room.in(table.tableId).emit('reset');
            room.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i < table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    room.in(table.players[i].username.name).emit('minByIn');
                } 
            }
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].timeOut >= 2) {
                    room.in(table.players[i].username.name).emit('force leave');
                }
            }
            if (table.players.length >= 3) {
                for (let i = 0; i < table.players.length; i++) {
                    if (table.players[i].username.name === 'sadik') {
                        room.in(table.tableId).emit('computer leave', table);
                        table.players.splice(i, 1);
                        let gameroom = gameRoute.fetchRoom(table.tableId)
                        gameroom.removePlayer('sadik');
                    }
                }
                for (let i = 0; i < table.activePlayers.length; i++) {
                    if (table.activePlayers[i] === 'sadik') {
                        table.activePlayers.splice(i, 1);
                    }
                }
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchRoom(tableID);
            if (table.players.length >= 1) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data)) {
            room.in(player).emit('low balance');
        }
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room.in(table.tableId).emit('removeActiveChaal', player);
            room.in(table.tableId).emit('restore inc');
            room.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.blindLimit--;
                    thePlayer.cardStatus = true;
                    room.in(player).emit('disable blind')
                    room.in(player).emit('display cards', thePlayer.cards);
                    room.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }
    });
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data)) {
            room.in(player).emit('low balance');
        }
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            room.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room.in(table.tableId).emit('removeActiveChaal', player);
            room.in(table.tableId).emit('restore inc');
            room.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    });
    socket.on('pack', function (tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        thePlayer.lastMove = 'Packed';
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        table = fetchRoom(tableID);
        total[tableID] = table.activePlayers.length;
        room.in(table.tableId).emit('removeActiveChaal', player);
        room.in(table.tableId).emit('updatePlayer', 'Packed', player);
        if (thePlayer.currentPocket < table.minBuyIn) {
            room.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    });
    socket.on('cards open', (tableID, player) => {
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        console.log(`players turn on card seen ${table.playerTurn}`);
        if (thePlayer.username.name == table.playerTurn) {
            console.log(`table chaal ${table.chalValue}`);
            table.chalValue = parseInt(table.chalValue) * 2;
            room.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                room.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        room.in(player).emit('disable blind')
        room.in(player).emit('display cards', thePlayer.cards);
        room.in(tableID).emit('update status', thePlayer.username.name)
        room.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    });

    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        let status = 'Show';
        if (parseInt(thePlayer.currentPocket) < parseInt(data)) {
            room.in(player).emit('low balance');
        }
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            // console.log("show " + table.potValue)
            room.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room.in(table.tableId).emit('removeActiveChaal', player);
            room.in(table.tableId).emit('updatePlayer', 'Show', player);

            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            let pos = nextpos ? 0 : 1;
            let pos1 = nextpos ? 1 : 0;
            let theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    });
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        console.log(table.activePlayers);
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        console.log(prevPlayer.username.name)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            room.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                room.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false
                room.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                room.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                room.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                room.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    room.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            room.in(tableID).emit('sideshow error')
        }

    });
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        let i = table.activePlayers.indexOf(player);
        let status = 'Chaal';
        let preStatus = 'accept'
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        let prevPlayer = getPlayer(table, table.activePlayers[pos]);
        console.log(prevPlayer.username.name)
        room.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        let cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        room.in(table.tableId).emit('sideshow winner', result.id, thePlayer, prevPlayer);
        setTimeout(() => {
            room.in(table.tableId).emit('updatePlayer', status, player);
            room.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
            getNextActivePlayer(tableID);
        }, 3500)
    });
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        let i = table.activePlayers.indexOf(player);
        let status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        let prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        room.in(table.tableId).emit('updatePlayer', status, player);
        room.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    });
    socket.on('invite', function (username, url, tableId, currUser) {
        let newUrl = `${url}?tableid=${tableId}`;
        console.log(newUrl);
        room.in(username).emit('invite request', newUrl, currUser)
    });
    socket.on('leave', function (tableID, player) {
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        console.log('leave');
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        // console.log(`leave  ${table.activePlayers.length}`)
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        room.in(table.tableId).emit('remove', table, player);
        room.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);
    });
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        room.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    });
});

//-------------------------ROOM 2 --------------------------//
room2.on('connection', function (socket) {
    var total = {};
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchRoom(tableID) {
        for (let i = 0; i < tableArray.length; i++)
            if (tableArray[i].tableId == tableID)
                currentRoom = tableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn, allUsers) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        // computer1 = new client('1', 'sadik', '500000', 'user')
        // computer2 = new client('2', 'dipesh', '50000', 'user')
        // computer3 = new client('3', 'player2', '50000', 'user')
        // computer4 = new client('4', 'player4', '50000', 'user')
        // computer5 = new client('5', 'player3', '50000', 'user')
        if (tableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            tableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < tableArray.length; i++) {
                if (tableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < tableArray[pos].players.length; j++) {
                    if (tableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    tableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                tableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });

    socket.on('fulfill', function (tableID) {
        currentRoom = fetchRoom(tableID);
        room2.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {

        currentRoom = fetchRoom(tableID);
        player1 = 'sadik'
        // player2 = 'player2'
        // player3 = 'player3'
        // player4 = 'player4'
        if (currentRoom.players.length == 1) {
            console.log('if ')
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player1);
            room2.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room2.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);

        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player);
            room2.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            console.log(table);
            // currentRoom.potValue = currentRoom.bootamount * currentRoom.activePlayers.length;
            var newgame = 5000;
            room2.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);

        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            // pushPlayerActive(currentRoom,player);
            room2.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            var newgame = 5000;
            room2.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);

        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            room2.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length == 1 && currentRoom.players[0].username.name !== 'sadik') {
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, 'sadik');
            currentRoom = fetchRoom(currentRoom.tableId);
            room2.in(currentRoom.tableId).emit('populate', currentRoom);
        }
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            for (let i = 0; i < currentRoom.players.length; i++) {
                console.log(currentRoom.minBuyIn)
                if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                    console.log(currentRoom.players[i].currentPocket);
                    var cards;
                    [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                    let flag = 0;
                    for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                        if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                            flag = 1;
                            // console.log("second loop");
                            break;
                        }
                    }
                    if (!flag)
                        currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                    currentRoom.playerChance = 0;
                    currentRoom.players[i].lastMove = null;
                    currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                    currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                    updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                    room2.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                    currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                    room2.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                    room2.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                    currentRoom.players[i].cards = cards;
                    currentRoom.players[i].blindLimit = 4;
                    currentRoom.players[i].cardStatus = false;
                }
                else {
                    room2.in(currentRoom.players[i].username.name).emit('minByIn');
                }
            }
            currentRoom.lastMove = true;
            currentRoom.playerChance = 0;
            currentRoom.bootamount = saveBootAmount;
            currentRoom.chalValue = currentRoom.bootamount;
            if (currentRoom.activePlayers.length === 1) {
                room2.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                room2.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                room2.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    room2.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }
    function getNextActivePlayer(tableID) {
        var table = fetchRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                room2.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            var thePlayerIndex = table.activePlayers[table.playerChance];
            var thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    room2.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    room2.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchRoom(tableID);
                    if (table.activePlayers.length > 2)
                        room2.in(thePlayer.username.name).emit('active side show');
                }
            }
            if (thePlayer != undefined) {
                console.log("player name " + thePlayer.username.name)
                room2.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
                if (thePlayer.username.name === 'sadik') {
                    if (table.players.length >= 3 || thePlayer.blindLimit <= 0) {
                        {
                            let chance = table.playerChance;
                            setTimeout(() => {
                                if (chance >= 1) {
                                    room2.in(table.activePlayers[0]).emit('computer show');
                                }
                                else {
                                    room2.in(table.activePlayers[1]).emit('computer show');
                                }
                            }, 3000)
                        }
                    }
                    else if (thePlayer.blindLimit >= 1) {
                        let chance = table.playerChance;
                        setTimeout(() => {
                            if (chance >= 1) {
                                console.log(table.playerChance)
                                // console.log("compuer show if " + table.activePlayers[1])
                                room2.in(table.activePlayers[0]).emit('computer blind');
                            }
                            else {
                                // console.log("compuer show else " + table.activePlayers[1])
                                room2.in(table.activePlayers[1]).emit('computer blind');
                            }
                            // room2.in(table.tableId).emit('computer blind');
                        }, 3000)
                    }
                    else {
                        let chance = table.playerChance;
                        setTimeout(() => {
                            thePlayer.blindLimit--;
                            if (chance >= 1) {
                                // console.log("compuer show if " + table.activePlayers[1])
                                room2.in(table.activePlayers[0]).emit('computer chaal');
                            }
                            else {
                                // console.log("compuer show else " + table.activePlayers[1])
                                room2.in(table.activePlayers[1]).emit('computer chaal');
                            }
                            // room2.in(table.tableId).emit('computer chaal');
                        }, 3000)
                    }
                }
                nomove[tableID] = setTimeout(() => {
                    thePlayer.timeOut = thePlayer.timeOut + 1;
                    let i = table.activePlayers.indexOf(thePlayer.username.name);
                    table.activePlayers.splice(i, 1);
                    table.playerChance--;
                    responseString = `${thePlayer.username.name} timed out.`;
                    room2.in(table.tableId).emit('timeout', responseString);
                    room2.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                    setTimeout(() => {
                        // console.log(table.tableId)
                        getNextActivePlayer(table.tableId);
                    }, 2000)
                }, 25000)
            }
            else {
                setTimeout(() => {
                    getNextActivePlayer(table.tableId);
                }, 3000)
            }
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchRoom(tableID);
        room2.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    room2.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        room2.in(table.tableId).emit('declareWinner', theWinner.username.name);
        room2.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        table.potValue = 0;
        var newgame = 5000;
        setTimeout(() => {
            room2.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            room2.in(table.tableId).emit('reset');
            room2.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    room2.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    room2.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
            if (table.players.length >= 3) {
                for (var i = 0; i < table.players.length; i++) {
                    if (table.players[i].username.name === 'sadik') {
                        room2.in(table.tableId).emit('computer leave', table);
                        table.players.splice(i, 1);
                        let gameroom = gameRoute.fetchRoom(table.tableId)
                        gameroom.removePlayer('sadik');
                    }
                }
                for (var i = 0; i < table.activePlayers.length; i++) {
                    if (table.activePlayers[i] === 'sadik') {
                        table.activePlayers.splice(i, 1);
                    }
                }
            }
            else if (table.players.length == 1 && table.players[0].username.name !== 'sadik') {
                computer1 = new client('1', 'sadik', '500000', 'user')
                table.addPlayer(computer1)
                pushPlayerActive(table, 'sadik');
                table = fetchRoom(tableID);
                room2.in(table.tableId).emit('populate', table);
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchRoom(tableID);
            if (table.players.length >= 1) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room2.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room2.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room2.in(table.tableId).emit('removeActiveChaal', player);
            room2.in(table.tableId).emit('restore inc');
            room2.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.blindLimit--;
                    thePlayer.cardStatus = true;
                    room2.in(player).emit('disable blind')
                    room2.in(player).emit('display cards', thePlayer.cards);
                    room2.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    });
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room2.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            room2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room2.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room2.in(table.tableId).emit('removeActiveChaal', player);
            room2.in(table.tableId).emit('restore inc');
            room2.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    });
    socket.on('pack', function (tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        room2.in(table.tableId).emit('removeActiveChaal', player);
        room2.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            room2.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    });
    socket.on('cards open', (tableID, player) => {
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            room2.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                room2.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        room2.in(player).emit('disable blind')
        room2.in(player).emit('display cards', thePlayer.cards);
        room2.in(tableID).emit('update status', thePlayer.username.name)
        room2.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    });
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room2.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room2.in(table.tableId).emit('removeActiveChaal', player);
            room2.in(table.tableId).emit('updatePlayer', 'Show', player);
            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            var pos = nextpos ? 0 : 1;
            var pos1 = nextpos ? 1 : 0;
            var theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    });
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchRoom(tableID);
        console.log(table)
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        console.log(thePlayer, prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            room2.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                room2.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                room2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                room2.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                room2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                room2.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    room2.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            room2.in(tableID).emit('sideshow error')
        }
    });
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        var preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room2.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        console.log(thePlayer, prevPlayer)
        var cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed'
        }
        room2.in(tableID).emit('sideshow winner', result.id)
        room2.in(table.tableId).emit('updatePlayer', status, player);
        room2.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    });
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room2.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        room2.in(table.tableId).emit('updatePlayer', status, player);
        room2.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    });
    socket.on('send tip', function (tip, player) {
        User.find({ username: player }, function (err, data) {
            if (err)
                console.log(err)
            else {
                if (data[0].credits < tip)
                    room2.in(player).emit('tip error');
                else {
                    updateUserCredit(player, -tip);
                    room2.in(player).emit('tip added');
                }

            }
        })
    });
    socket.on('leave', function (tableID, player) {
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        room2.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        room2.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);

    });
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        room2.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    });
});

//-------------------------ROOM 3 --------------------------//
room3.on('connection', function (socket) {
    var total = {};
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchRoom(tableID) {
        for (let i = 0; i < tableArray.length; i++)
            if (tableArray[i].tableId == tableID)
                currentRoom = tableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn, allUsers) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        // computer1 = new client('1', 'sadik', '500000', 'user')
        // computer2 = new client('2', 'dipesh', '50000', 'user')
        // computer3 = new client('3', 'player2', '50000', 'user')
        // computer4 = new client('4', 'player4', '50000', 'user')
        // computer5 = new client('5', 'player3', '50000', 'user')
        if (tableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            tableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < tableArray.length; i++) {
                if (tableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < tableArray[pos].players.length; j++) {
                    if (tableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    tableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                tableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });
    socket.on('fulfill', function (tableID) {
        currentRoom = fetchRoom(tableID);
        room3.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchRoom(tableID);
        player1 = 'sadik'
        // player2 = 'player2'
        // player3 = 'player3'
        // player4 = 'player4'
        if (currentRoom.players.length == 1) {
            console.log('if game')
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player1);
            room3.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room3.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);

        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player);
            room3.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room3.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);

        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            room3.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room3.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            room3.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        console.log("game begin")
        if (currentRoom.players.length == 1 && currentRoom.players[0].username.name !== 'sadik') {
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, 'sadik');
            currentRoom = fetchRoom(currentRoom.tableId);
            room3.in(currentRoom.tableId).emit('populate', currentRoom);
        }
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            for (let i = 0; i < currentRoom.players.length; i++) {
                console.log(currentRoom.minBuyIn)
                if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                    console.log(currentRoom.players[i].currentPocket);
                    var cards;
                    [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                    let flag = 0;
                    for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                        if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                            flag = 1;
                            // console.log("second loop");
                            break;
                        }
                    }
                    if (!flag)
                        currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                    currentRoom.playerChance = 0;
                    currentRoom.players[i].lastMove = null;
                    currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                    currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                    updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                    room3.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                    currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                    room3.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                    room3.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                    currentRoom.players[i].cards = cards;
                    currentRoom.players[i].blindLimit = 4;
                    currentRoom.players[i].cardStatus = false;
                }
                else {
                    room3.in(currentRoom.players[i].username.name).emit('minByIn');
                }
            }
            currentRoom.lastMove = true;
            currentRoom.playerChance = 0;
            currentRoom.bootamount = saveBootAmount;
            currentRoom.chalValue = currentRoom.bootamount;
            if (currentRoom.activePlayers.length === 1) {
                room3.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                room3.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                room3.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    room3.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }
    function getNextActivePlayer(tableID) {
        console.log(tableID);
        var table = fetchRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        }
        else {
            console.log("chance " + table.playerChance + "active length " + table.activePlayers.length);
            if (table.activePlayers.length === 2)
                room3.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            console.log("chance " + table.playerChance + "active length " + table.activePlayers.length);
            var thePlayerIndex = table.activePlayers[table.playerChance];
            console.log("player index " + thePlayerIndex)
            var thePlayer = getPlayer(table, thePlayerIndex);
            console.log("player" + thePlayer);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    room3.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    room3.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchRoom(tableID);
                    if (table.activePlayers.length > 2)
                        room3.in(thePlayer.username.name).emit('active side show');
                }
            }
            console.log("player name " + thePlayer.username.name)
            room3.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
            if (thePlayer.username.name === 'sadik') {
                if (table.players.length >= 3 || thePlayer.blindLimit <= 0) {
                    {
                        let chance = table.playerChance;
                        setTimeout(() => {
                            if (chance >= 1) {
                                room3.in(table.activePlayers[0]).emit('computer show');
                            }
                            else {
                                room3.in(table.activePlayers[1]).emit('computer show');
                            }
                        }, 3000)
                    }
                }
                else if (thePlayer.blindLimit >= 1) {
                    let chance = table.playerChance;
                    setTimeout(() => {
                        if (chance >= 1) {
                            console.log(table.playerChance)
                            // console.log("compuer show if " + table.activePlayers[1])
                            room3.in(table.activePlayers[0]).emit('computer blind');
                        }
                        else {
                            // console.log("compuer show else " + table.activePlayers[1])
                            room3.in(table.activePlayers[1]).emit('computer blind');
                        }
                        // room3.in(table.tableId).emit('computer blind');
                    }, 3000)
                }
                else {
                    let chance = table.playerChance;
                    setTimeout(() => {
                        thePlayer.blindLimit--;
                        if (chance >= 1) {
                            // console.log("compuer show if " + table.activePlayers[1])
                            room3.in(table.activePlayers[0]).emit('computer chaal');
                        }
                        else {
                            // console.log("compuer show else " + table.activePlayers[1])
                            room3.in(table.activePlayers[1]).emit('computer chaal');
                        }
                        // room3.in(table.tableId).emit('computer chaal');
                    }, 3000)
                }
            }
            nomove[tableID] = setTimeout(() => {
                thePlayer.timeOut = thePlayer.timeOut + 1;
                let i = table.activePlayers.indexOf(thePlayer.username.name);
                table.activePlayers.splice(i, 1);
                table.playerChance--;
                responseString = `${thePlayer.username.name} timed out.`;
                room3.in(table.tableId).emit('timeout', responseString)
                room3.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                getNextActivePlayer(table.tableId);
            }, 25000)
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchRoom(tableID);
        room3.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    room3.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        room3.in(table.tableId).emit('declareWinner', theWinner.username.name);
        room3.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        table.potValue = 0;
        var newgame = 5000;
        setTimeout(() => {
            room3.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            room3.in(table.tableId).emit('reset');
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    room3.in(table.players[i].username.name).emit('minByIn');
                }
            }
            room3.in(table.tableId).emit('new game', newgame);
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    room3.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
            if (table.players.length >= 3) {
                for (var i = 0; i < table.players.length; i++) {
                    if (table.players[i].username.name === 'sadik') {
                        room3.in(table.tableId).emit('computer leave', table);
                        table.players.splice(i, 1);
                        let gameroom = gameRoute.fetchRoom(table.tableId)
                        gameroom.removePlayer('sadik');
                    }
                }
                for (var i = 0; i < table.activePlayers.length; i++) {
                    if (table.activePlayers[i] === 'sadik') {
                        table.activePlayers.splice(i, 1);
                    }
                }
            }
            else if (table.players.length == 1 && table.players[0].username.name !== 'sadik') {
                computer1 = new client('1', 'sadik', '500000', 'user')
                table.addPlayer(computer1)
                pushPlayerActive(table, 'sadik');
                table = fetchRoom(tableID);
                room3.in(table.tableId).emit('populate', table);
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchRoom(tableID);
            if (table.players.length >= 1) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room3.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room3.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room3.in(table.tableId).emit('removeActiveChaal', player);
            room3.in(table.tableId).emit('restore inc');
            room3.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.blindLimit--;
                    thePlayer.cardStatus = true;
                    room3.in(player).emit('disable blind')
                    room3.in(player).emit('display cards', thePlayer.cards);
                    room3.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    });
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room3.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            room3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room3.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room3.in(table.tableId).emit('removeActiveChaal', player);
            room3.in(table.tableId).emit('restore inc');
            room3.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    });
    socket.on('pack', function (tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        room3.in(table.tableId).emit('removeActiveChaal', player);
        room3.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            room3.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    });
    socket.on('cards open', (tableID, player) => {
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            room3.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                room3.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        // console.log(data,thePlayer, thePlayer.cards)
        room3.in(player).emit('disable blind')
        room3.in(player).emit('display cards', thePlayer.cards);
        room3.in(tableID).emit('update status', thePlayer.username.name)
        room3.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    });
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room3.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room3.in(table.tableId).emit('removeActiveChaal', player);
            room3.in(table.tableId).emit('updatePlayer', 'Show', player);
            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            var pos = nextpos ? 0 : 1;
            var pos1 = nextpos ? 1 : 0;
            var theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    });
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchRoom(tableID);
        console.log(table)
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        console.log(thePlayer, prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            room3.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                room3.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                room3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                room3.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                room3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                room3.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    room3.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            room3.in(tableID).emit('sideshow error')
        }
    });
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'chaal';
        var preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room3.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        console.log(thePlayer, prevPlayer)
        var cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        room3.in(tableID).emit('sideshow winner', result.id);
        room3.in(table.tableId).emit('updatePlayer', status, player);
        room3.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    });
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room3.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        room3.in(table.tableId).emit('updatePlayer', status, player);
        room3.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    });
    socket.on('send tip', function (tip, player) {
        User.find({ username: player }, function (err, data) {
            if (err)
                console.log(err)
            else {
                if (data[0].credits < tip)
                    room3.in(player).emit('tip error');
                else {
                    updateUserCredit(player, -tip);
                    room3.in(player).emit('tip added');
                }

            }
        })
    });
    socket.on('leave', function (tableID, player) {
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        room3.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        room3.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);

    });
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        };
        room3.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    });
});

//-------------------------ROOM 4 --------------------------//
room4.on('connection', function (socket) {
    var total = {};
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchRoom(tableID) {
        for (let i = 0; i < tableArray.length; i++)
            if (tableArray[i].tableId == tableID)
                currentRoom = tableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn, allUsers) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        // computer1 = new client('1', 'sadik', '500000', 'user')
        // computer2 = new client('2', 'dipesh', '50000', 'user')
        // computer3 = new client('3', 'player2', '50000', 'user')
        // computer4 = new client('4', 'player4', '50000', 'user')
        // computer5 = new client('5', 'player3', '50000', 'user')
        if (tableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            tableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < tableArray.length; i++) {
                if (tableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < tableArray[pos].players.length; j++) {
                    if (tableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    tableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                tableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });
    socket.on('fulfill', function (tableID) {
        currentRoom = fetchRoom(tableID);
        room4.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchRoom(tableID);
        player1 = 'sadik'
        // player2 = 'player2'
        // player3 = 'player3'
        // player4 = 'player4'
        if (currentRoom.players.length == 1) {
            console.log('if')
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player1);
            room4.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room4.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player);
            room4.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room4.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            room4.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room4.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            room4.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length == 1 && currentRoom.players[0].username.name !== 'sadik') {
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, 'sadik');
            currentRoom = fetchRoom(currentRoom.tableId);
            room4.in(currentRoom.tableId).emit('populate', currentRoom);
        }
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            for (let i = 0; i < currentRoom.players.length; i++) {
                console.log(currentRoom.minBuyIn)
                if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                    console.log(currentRoom.players[i].currentPocket);
                    var cards;
                    [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                    let flag = 0;
                    for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                        if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                            flag = 1;
                            // console.log("second loop");
                            break;
                        }
                    }
                    if (!flag)
                        currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                    currentRoom.playerChance = 0;
                    currentRoom.players[i].lastMove = null;
                    currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                    currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                    updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                    room4.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                    currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                    room4.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                    room4.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                    currentRoom.players[i].cards = cards;
                    currentRoom.players[i].blindLimit = 4;
                    currentRoom.players[i].cardStatus = false;
                }
                else {
                    room4.in(currentRoom.players[i].username.name).emit('minByIn');
                }
            }
            currentRoom.lastMove = true;
            currentRoom.playerChance = 0;
            currentRoom.bootamount = saveBootAmount;
            currentRoom.chalValue = currentRoom.bootamount;
            if (currentRoom.activePlayers.length === 1) {
                room4.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                room4.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                room4.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    room4.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }
    function getNextActivePlayer(tableID) {
        var table = fetchRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                room4.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            var thePlayerIndex = table.activePlayers[table.playerChance];
            var thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    room4.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    room4.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchRoom(tableID);
                    if (table.activePlayers.length > 2)
                        room4.in(thePlayer.username.name).emit('active side show');
                }
            }
            if (thePlayer) {
                console.log("player name " + thePlayer.username.name)
                room4.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
                if (thePlayer.username.name === 'sadik') {
                    if (table.players.length >= 3 || thePlayer.blindLimit <= 0) {
                        {
                            let chance = table.playerChance;
                            setTimeout(() => {
                                if (chance >= 1) {
                                    room4.in(table.activePlayers[0]).emit('computer show');
                                }
                                else {
                                    room4.in(table.activePlayers[1]).emit('computer show');
                                }
                            }, 3000)
                        }
                    }
                    else if (thePlayer.blindLimit >= 1) {
                        let chance = table.playerChance;
                        setTimeout(() => {
                            if (chance >= 1) {
                                console.log(table.playerChance)
                                // console.log("compuer show if " + table.activePlayers[1])
                                room4.in(table.activePlayers[0]).emit('computer blind');
                            }
                            else {
                                // console.log("compuer show else " + table.activePlayers[1])
                                room4.in(table.activePlayers[1]).emit('computer blind');
                            }
                            // room4.in(table.tableId).emit('computer blind');
                        }, 3000)
                    }
                    else {
                        let chance = table.playerChance;
                        setTimeout(() => {
                            thePlayer.blindLimit--;
                            if (chance >= 1) {
                                // console.log("compuer show if " + table.activePlayers[1])
                                room4.in(table.activePlayers[0]).emit('computer chaal');
                            }
                            else {
                                // console.log("compuer show else " + table.activePlayers[1])
                                room4.in(table.activePlayers[1]).emit('computer chaal');
                            }
                            // room4.in(table.tableId).emit('computer chaal');
                        }, 3000)
                    }
                }
                nomove[tableID] = setTimeout(() => {
                    thePlayer.timeOut = thePlayer.timeOut + 1;
                    let i = table.activePlayers.indexOf(thePlayer.username.name);
                    table.activePlayers.splice(i, 1);
                    table.playerChance--;
                    responseString = `${thePlayer.username.name} timed out.`;
                    room4.in(table.tableId).emit('timeout', responseString)
                    room4.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                    setTimeout(() => {
                        // console.log(table.tableId)
                        getNextActivePlayer(table.tableId);
                    }, 2000)
                }, 25000)
            }
            else {
                setTimeout(() => {
                    getNextActivePlayer(table.tableId);
                }, 3000)
            }
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchRoom(tableID);
        room4.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    room4.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        room4.in(table.tableId).emit('declareWinner', theWinner.username.name);
        room4.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        var newgame = 5000;
        setTimeout(() => {
            room4.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            room4.in(table.tableId).emit('reset');
            room4.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    room4.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    room4.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
            if (table.players.length >= 3) {
                for (var i = 0; i < table.players.length; i++) {
                    if (table.players[i].username.name === 'sadik') {
                        room4.in(table.tableId).emit('computer leave', table);
                        table.players.splice(i, 1);
                        let gameroom = gameRoute.fetchRoom(table.tableId)
                        gameroom.removePlayer('sadik');
                    }
                }
                for (var i = 0; i < table.activePlayers.length; i++) {
                    if (table.activePlayers[i] === 'sadik') {
                        table.activePlayers.splice(i, 1);
                    }
                }
            }
            else if (table.players.length == 1 && table.players[0].username.name !== 'sadik') {
                computer1 = new client('1', 'sadik', '500000', 'user')
                table.addPlayer(computer1)
                pushPlayerActive(table, 'sadik');
                table = fetchRoom(tableID);
                room4.in(table.tableId).emit('populate', table);
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchRoom(tableID);
            if (table.players.length >= 1) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room4.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room4.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room4.in(table.tableId).emit('removeActiveChaal', player);
            room4.in(table.tableId).emit('restore inc');
            room4.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.blindLimit--;
                    thePlayer.cardStatus = true;
                    room4.in(player).emit('disable blind')
                    room4.in(player).emit('display cards', thePlayer.cards);
                    room4.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    })
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room4.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            room4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room4.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room4.in(table.tableId).emit('removeActiveChaal', player);
            room4.in(table.tableId).emit('restore inc');
            room4.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    })
    socket.on('pack', function (tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        room4.in(table.tableId).emit('removeActiveChaal', player);
        room4.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            room4.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    })
    socket.on('cards open', (tableID, player) => {
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            room4.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                room4.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        // console.log(data,thePlayer, thePlayer.cards)
        room4.in(player).emit('disable blind')
        room4.in(player).emit('display cards', thePlayer.cards);
        room4.in(tableID).emit('update status', thePlayer.username.name);
        room4.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    })
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room4.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room4.in(table.tableId).emit('removeActiveChaal', player);
            room4.in(table.tableId).emit('updatePlayer', 'Show', player);

            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            var pos = nextpos ? 0 : 1;
            var pos1 = nextpos ? 1 : 0;
            var theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    })
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchRoom(tableID);
        console.log(table)
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        console.log(thePlayer, prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            room4.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                room4.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                room4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                room4.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                room4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                room4.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    room4.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            room4.in(tableID).emit('sideshow error')
        }
    })
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        var preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room4.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        console.log(thePlayer, prevPlayer)
        var cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        room4.in(tableID).emit('sideshow winner', result.id);
        room4.in(table.tableId).emit('updatePlayer', status, player);
        room4.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room4.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        room4.in(table.tableId).emit('updatePlayer', status, player);
        room4.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('send tip', function (tip, player) {
        User.find({ username: player }, function (err, data) {
            if (err)
                console.log(err)
            else {
                if (data[0].credits < tip)
                    room4.in(player).emit('tip error');
                else {
                    updateUserCredit(player, -tip);
                    room4.in(player).emit('tip added');
                }

            }
        })
    })
    socket.on('leave', function (tableID, player) {
        console.log(tableID, player)
        var table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        room4.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        room4.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);

    })
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        room4.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    })
});

//-------------------------ROOM 5 --------------------------//
room5.on('connection', function (socket) {
    var total = {};
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchRoom(tableID) {
        for (let i = 0; i < tableArray.length; i++)
            if (tableArray[i].tableId == tableID)
                currentRoom = tableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn, allUsers) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        // computer1 = new client('1', 'sadik', '500000', 'user')
        // computer2 = new client('2', 'dipesh', '50000', 'user')
        // computer3 = new client('3', 'player2', '50000', 'user')
        // computer4 = new client('4', 'player4', '50000', 'user')
        // computer5 = new client('5', 'player3', '50000', 'user')
        if (tableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            tableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < tableArray.length; i++) {
                if (tableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < tableArray[pos].players.length; j++) {
                    if (tableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    tableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                tableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });
    socket.on('fulfill', function (tableID) {
        currentRoom = fetchRoom(tableID);
        room5.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchRoom(tableID);
        player1 = 'sadik'
        // player2 = 'player2'
        // player3 = 'player3'
        // player4 = 'player4'
        if (currentRoom.players.length == 1) {
            console.log('if')
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player1);
            room5.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room5.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pushPlayerActive(currentRoom, player);
            room5.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room5.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            // pushPlayerActive(currentRoom,player);
            room5.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            room5.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            room5.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length == 1 && currentRoom.players[0].username.name !== 'sadik') {
            computer1 = new client('1', 'sadik', '500000', 'user')
            currentRoom.addPlayer(computer1)
            pushPlayerActive(currentRoom, 'sadik');
            currentRoom = fetchRoom(currentRoom.tableId);
            room5.in(currentRoom.tableId).emit('populate', currentRoom);
        }
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            for (let i = 0; i < currentRoom.players.length; i++) {
                console.log(currentRoom.minBuyIn)
                if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                    console.log(currentRoom.players[i].currentPocket);
                    var cards;
                    [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                    let flag = 0;
                    for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                        if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                            flag = 1;
                            // console.log("second loop");
                            break;
                        }
                    }
                    if (!flag)
                        currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                    currentRoom.playerChance = 0;
                    currentRoom.players[i].lastMove = null;
                    currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                    currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                    updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                    room5.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                    currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                    room5.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                    room5.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                    currentRoom.players[i].cards = cards;
                    currentRoom.players[i].blindLimit = 4;
                    currentRoom.players[i].cardStatus = false;
                }
                else {
                    room5.in(currentRoom.players[i].username.name).emit('minByIn');
                }
            }
            currentRoom.lastMove = true;
            currentRoom.playerChance = 0;
            currentRoom.bootamount = saveBootAmount;
            currentRoom.chalValue = currentRoom.bootamount;
            if (currentRoom.activePlayers.length === 1) {
                room5.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                room5.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                room5.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    room5.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }
    function getNextActivePlayer(tableID) {
        var table = fetchRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                room5.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            var thePlayerIndex = table.activePlayers[table.playerChance];
            var thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    room5.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    room5.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchRoom(tableID);
                    if (table.activePlayers.length > 2)
                        room5.in(thePlayer.username.name).emit('active side show');
                }
            }
            if (thePlayer) {
                console.log("player name " + thePlayer.username.name)
                room5.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
                if (thePlayer.username.name === 'sadik') {
                    if (table.players.length >= 3 || thePlayer.blindLimit <= 0) {
                        {
                            let chance = table.playerChance;
                            setTimeout(() => {
                                if (chance >= 1) {
                                    room5.in(table.activePlayers[0]).emit('computer show');
                                }
                                else {
                                    room5.in(table.activePlayers[1]).emit('computer show');
                                }
                            }, 3000)
                        }
                    }
                    else if (thePlayer.blindLimit >= 1) {
                        let chance = table.playerChance;
                        setTimeout(() => {
                            if (chance >= 1) {
                                console.log(table.playerChance)
                                // console.log("compuer show if " + table.activePlayers[1])
                                room5.in(table.activePlayers[0]).emit('computer blind');
                            }
                            else {
                                // console.log("compuer show else " + table.activePlayers[1])
                                room5.in(table.activePlayers[1]).emit('computer blind');
                            }
                            // room5.in(table.tableId).emit('computer blind');
                        }, 3000)
                    }
                    else {
                        let chance = table.playerChance;
                        setTimeout(() => {
                            thePlayer.blindLimit--;
                            if (chance >= 1) {
                                // console.log("compuer show if " + table.activePlayers[1])
                                room5.in(table.activePlayers[0]).emit('computer chaal');
                            }
                            else {
                                // console.log("compuer show else " + table.activePlayers[1])
                                room5.in(table.activePlayers[1]).emit('computer chaal');
                            }
                            // room5.in(table.tableId).emit('computer chaal');
                        }, 3000)
                    }
                }
                nomove[tableID] = setTimeout(() => {
                    thePlayer.timeOut = thePlayer.timeOut + 1;
                    let i = table.activePlayers.indexOf(thePlayer.username.name);
                    table.activePlayers.splice(i, 1);
                    table.playerChance--;
                    responseString = `${thePlayer.username.name} timed out.`;
                    room5.in(table.tableId).emit('timeout', responseString)
                    room5.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                    setTimeout(() => {
                        // console.log(table.tableId)
                        getNextActivePlayer(table.tableId);
                    }, 2000)
                }, 25000)
            }
            else {
                setTimeout(() => {
                    getNextActivePlayer(table.tableId);
                }, 3000)
            }
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchRoom(tableID);
        room5.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    room5.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        room5.in(table.tableId).emit('declareWinner', theWinner.username.name);
        room5.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        table.potValue = 0;
        var newgame = 5000;
        setTimeout(() => {
            room5.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            room5.in(table.tableId).emit('reset');
            room5.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    room5.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    room5.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
            if (table.players.length >= 3) {
                for (var i = 0; i < table.players.length; i++) {
                    if (table.players[i].username.name === 'sadik') {
                        room5.in(table.tableId).emit('computer leave', table);
                        table.players.splice(i, 1);
                        let gameroom = gameRoute.fetchRoom(table.tableId)
                        gameroom.removePlayer('sadik');
                    }
                }
                for (var i = 0; i < table.activePlayers.length; i++) {
                    if (table.activePlayers[i] === 'sadik') {
                        table.activePlayers.splice(i, 1);
                    }
                }
            }
            else if (table.players.length == 1 && table.players[0].username.name !== 'sadik') {
                computer1 = new client('1', 'sadik', '500000', 'user')
                table.addPlayer(computer1)
                pushPlayerActive(table, 'sadik');
                table = fetchRoom(tableID);
                room5.in(table.tableId).emit('populate', table);
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchRoom(tableID);
            if (table.players.length >= 1) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room5.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room5.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room5.in(table.tableId).emit('removeActiveChaal', player);
            room5.in(table.tableId).emit('restore inc');
            room5.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.blindLimit--;
                    thePlayer.cardStatus = true;
                    room5.in(player).emit('disable blind')
                    room5.in(player).emit('display cards', thePlayer.cards);
                    room5.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    });
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room5.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            room5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room5.in(table.tableId).emit('updateChaalValue', table.chalValue);
            room5.in(table.tableId).emit('removeActiveChaal', player);
            room5.in(table.tableId).emit('restore inc');
            room5.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    });
    socket.on('pack', function (tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        room5.in(table.tableId).emit('removeActiveChaal', player);
        room5.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            room5.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    });
    socket.on('cards open', (tableID, player) => {
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            room5.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                room5.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        // console.log(data,thePlayer, thePlayer.cards)
        room5.in(player).emit('disable blind')
        room5.in(player).emit('display cards', thePlayer.cards);
        room5.in(tableID).emit('update status', thePlayer.username.name);
        room5.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    });
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            room5.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            room5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            room5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            room5.in(table.tableId).emit('removeActiveChaal', player);
            room5.in(table.tableId).emit('updatePlayer', 'Show', player);

            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            var pos = nextpos ? 0 : 1;
            var pos1 = nextpos ? 1 : 0;
            var theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    });
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchRoom(tableID);
        console.log(table)
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        console.log(thePlayer, prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            room5.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                room5.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                room5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                room5.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                room5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                room5.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    room5.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            room5.in(tableID).emit('sideshow error')
        }
    });
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        let table = fetchRoom(tableID);
        let thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        let i = table.activePlayers.indexOf(player);
        let status = 'chaal';
        let preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        let prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room5.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        console.log(thePlayer, prevPlayer)
        let cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        room5.in(tableID).emit('sideshow winner', result.id);
        room5.in(table.tableId).emit('updatePlayer', status, player);
        room5.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    });
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal'
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        room5.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        room5.in(table.tableId).emit('updatePlayer', status, player);
        room5.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    });
    socket.on('send tip', function (tip, player) {
        User.find({ username: player }, function (err, data) {
            if (err)
                console.log(err)
            else {
                if (data[0].credits < tip)
                    room5.in(player).emit('tip error');
                else {
                    updateUserCredit(player, -tip);
                    room5.in(player).emit('tip added');
                }

            }
        })
    });
    socket.on('leave', function (tableID, player) {
        console.log(tableID, player)
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        console.log(table)
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        room5.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player)
            clearTimeout(nomove[tableID]);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        room5.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);

    });
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchRoom(tableID);
        let gameroom = gameRoute.fetchRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        room5.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    });
});

// --------------------PRIVATE ROOM 1------------------------//
pvtRoom1.on('connection', function (socket) {
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchPvtRoom(tableID) {
        for (let i = 0; i < pvtTableArray.length; i++)
            if (pvtTableArray[i].tableId == tableID)
                currentRoom = pvtTableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn, roomName) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        if (pvtTableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn, roomName);
            newTable.addPlayer(newPlayer);
            pvtTableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < pvtTableArray.length; i++) {
                if (pvtTableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < pvtTableArray[pos].players.length; j++) {
                    if (pvtTableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    pvtTableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn, roomName);
                newTable.addPlayer(newPlayer);
                pvtTableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });
    socket.on('fulfill', function (tableID) {
        currentRoom = fetchPvtRoom(tableID);
        pvtRoom1.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchPvtRoom(tableID);
        if (currentRoom.players.length == 1) {
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom1.in(currUsername).emit('waitforothers');
            activeTable = tableID + "active";
            socket.join(activeTable);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom1.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom1.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);

        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            // pushPlayerActive(currentRoom,player);
            pvtRoom1.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom1.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            pvtRoom1.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            if (currentRoom.players.length > 1) {
                for (let i = 0; i < currentRoom.players.length; i++) {
                    if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                        console.log(currentRoom.players[i].currentPocket);
                        var cards;
                        [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                        let flag = 0;
                        for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                            if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                                flag = 1;
                                // console.log("second loop");
                                break;
                            }
                        }
                        if (!flag)
                            currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                        currentRoom.playerChance = 0;
                        currentRoom.players[i].lastMove = null;
                        currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                        currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                        updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                        pvtRoom1.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                        currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                        pvtRoom1.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                        pvtRoom1.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                        currentRoom.players[i].cards = cards;
                        currentRoom.players[i].blindLimit = 4;
                        currentRoom.players[i].cardStatus = false;
                    }
                    else {
                        pvtRoom1.in(currentRoom.players[i].username.name).emit('minByIn');
                    }
                }
                currentRoom.lastMove = true;
                currentRoom.playerChance = 0;
                currentRoom.bootamount = saveBootAmount;
                currentRoom.chalValue = currentRoom.bootamount;
            }
            if (currentRoom.activePlayers.length === 1) {
                pvtRoom1.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                pvtRoom1.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                pvtRoom1.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    pvtRoom1.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }

    function getNextActivePlayer(tableID) {
        let table = fetchPvtRoom(tableID);
        if (table.activePlayers.length === 1) {
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                pvtRoom1.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            let thePlayerIndex = table.activePlayers[table.playerChance];
            let thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    pvtRoom1.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    pvtRoom1.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchPvtRoom(tableID);
                    if (table.activePlayers.length > 2)
                        pvtRoom1.in(thePlayer.username.name).emit('active side show');
                }
            }
            pvtRoom1.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
            nomove[tableID] = setTimeout(() => {
                thePlayer.timeOut = thePlayer.timeOut + 1;
                let i = table.activePlayers.indexOf(thePlayer.username.name);
                table.activePlayers.splice(i, 1);
                table.playerChance--;
                responseString = `${thePlayer.username.name} timed out.`;
                pvtRoom1.in(table.tableId).emit('timeout', responseString)
                pvtRoom1.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                setTimeout(() => {
                    // console.log(table.tableId)
                    getNextActivePlayer(table.tableId);
                }, 2000)
            }, 25000)
            table.playerChance++;
        }
    }
    function compared(tableID) {
        let table = fetchPvtRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (let player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        let table = fetchPvtRoom(tableID);
        pvtRoom1.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    pvtRoom1.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        pvtRoom1.in(table.tableId).emit('declareWinner', theWinner.username.name);
        pvtRoom1.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue));
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        table.potValue = 0;
        let newgame = 5000;
        setTimeout(() => {
            pvtRoom1.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            pvtRoom1.in(table.tableId).emit('reset');
            pvtRoom1.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                console.log("CP"+table.players[i].theWinner);
                if (table.players[i].currentPocket < table.minBuyIn) {
                    pvtRoom1.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    pvtRoom1.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchPvtRoom(tableID);
            if (table.players.length >= 2) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchPvtRoom(tableID);
        let thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom1.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom1.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom1.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom1.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom1.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom1.in(table.tableId).emit('restore inc');
            pvtRoom1.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;

                }
                else {
                    thePlayer.cardStatus = true;
                    pvtRoom1.in(player).emit('disable blind')
                    pvtRoom1.in(player).emit('display cards', thePlayer.cards);
                    pvtRoom1.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }
    });
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchPvtRoom(tableID);
        let thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom1.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom1.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            pvtRoom1.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom1.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom1.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom1.in(table.tableId).emit('restore inc');
            pvtRoom1.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    })
    socket.on('pack', function (tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchPvtRoom(tableID);
        let thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        pvtRoom1.in(table.tableId).emit('removeActiveChaal', player);
        pvtRoom1.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchPvtRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            pvtRoom1.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    })
    socket.on('cards open', (tableID, data) => {
        let table = fetchPvtRoom(tableID);
        let thePlayer = getPlayer(table, data);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            pvtRoom1.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                pvtRoom1.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        pvtRoom1.in(data).emit('disable blind')
        pvtRoom1.in(data).emit('display cards', thePlayer.cards);
        pvtRoom1.in(tableID).emit('update status', thePlayer.username.name);
        pvtRoom1.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    })
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchPvtRoom(tableID);
        let thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom1.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom1.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom1.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom1.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom1.in(table.tableId).emit('updatePlayer', 'Show', player);

            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            let pos = nextpos ? 0 : 1;
            let pos1 = nextpos ? 1 : 0;
            let theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    })
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        // console.log(thePlayer,prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            pvtRoom1.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                pvtRoom1.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                pvtRoom1.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                pvtRoom1.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                pvtRoom1.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                pvtRoom1.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    pvtRoom1.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            pvtRoom1.in(tableID).emit('sideshow error')
        }
    })
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        let table = fetchPvtRoom(tableID);
        let thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        let i = table.activePlayers.indexOf(player);
        let status = 'Chaal';
        let preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        let prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom1.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        // console.log(thePlayer,prevPlayer)
        let cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        pvtRoom1.in(tableID).emit('sideshow winner', result.id);
        pvtRoom1.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom1.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom1.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        pvtRoom1.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom1.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('invite', function (username, url, tableId, currUser) {
        let newUrl = url + "?tableid=" + tableId;
        console.log(newUrl);
        // game.in(username).emit('invite request', newUrl, currUser);
        pvtRoom1.in(username).emit('invite request', newUrl, currUser);
        pvtRoom2.in(username).emit('invite request', newUrl, currUser);
        pvtRoom3.in(username).emit('invite request', newUrl, currUser);
        pvtRoom4.in(username).emit('invite request', newUrl, currUser);
        pvtRoom5.in(username).emit('invite request', newUrl, currUser);
        room.in(username).emit('invite request', newUrl, currUser);
        room2.in(username).emit('invite request', newUrl, currUser);
        room3.in(username).emit('invite request', newUrl, currUser);
        room4.in(username).emit('invite request', newUrl, currUser);
        room5.in(username).emit('invite request', newUrl, currUser);
    })
    socket.on('leave', function (tableID, player) {
        // console.log(tableID,player)
        var table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        console.log(table)
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            gameOver(tableID);
        }
        pvtRoom1.in(table.tableId).emit('remove', table, player);
        pvtRoom1.in(player).emit('redirect', '/game');
        socket.leave(tableID);
        socket.leave(player);

    })
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        pvtRoom1.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    })
});

// --------------------PRIVATE ROOM 2------------------------//
pvtRoom2.on('connection', function (socket) {
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchPvtRoom(tableID) {
        for (let i = 0; i < pvtTableArray.length; i++)
            if (pvtTableArray[i].tableId == tableID)
                currentRoom = pvtTableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        if (pvtTableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            pvtTableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < pvtTableArray.length; i++) {
                if (pvtTableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < pvtTableArray[pos].players.length; j++) {
                    if (pvtTableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    pvtTableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                pvtTableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });

    socket.on('fulfill', function (tableID) {
        currentRoom = fetchPvtRoom(tableID);
        pvtRoom2.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchPvtRoom(tableID);
        if (currentRoom.players.length == 1) {
            console.log('if')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom2.in(currUsername).emit('waitforothers');
            activeTable = tableID + "active";
            socket.join(activeTable);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom2.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom2.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom2.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom2.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            pvtRoom2.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            if (currentRoom.players.length > 1) {
                for (let i = 0; i < currentRoom.players.length; i++) {
                    if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                        console.log(currentRoom.players[i].currentPocket);
                        var cards;
                        [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                        let flag = 0;
                        for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                            if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                                flag = 1;
                                // console.log("second loop");
                                break;
                            }
                        }
                        if (!flag)
                            currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                        currentRoom.playerChance = 0;
                        currentRoom.players[i].lastMove = null;
                        currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                        currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                        updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                        pvtRoom2.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                        currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                        pvtRoom2.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                        pvtRoom2.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                        currentRoom.players[i].cards = cards;
                        currentRoom.players[i].blindLimit = 4;
                        currentRoom.players[i].cardStatus = false;
                    }
                    else {
                        pvtRoom2.in(currentRoom.players[i].username.name).emit('minByIn');
                    }
                }
                currentRoom.lastMove = true;
                currentRoom.playerChance = 0;
                currentRoom.bootamount = saveBootAmount;
                currentRoom.chalValue = currentRoom.bootamount;
            }
            if (currentRoom.activePlayers.length === 1) {
                pvtRoom2.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                pvtRoom2.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                pvtRoom2.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    pvtRoom2.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }
    function getNextActivePlayer(tableID) {
        var table = fetchPvtRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                pvtRoom2.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            var thePlayerIndex = table.activePlayers[table.playerChance];
            var thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    pvtRoom2.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    pvtRoom2.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchPvtRoom(tableID);
                    if (table.activePlayers.length > 2)
                        pvtRoom2.in(thePlayer.username.name).emit('active side show');
                }
            }
            if (thePlayer) {
                console.log("player name " + thePlayer.username.name)
                pvtRoom2.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
                nomove[tableID] = setTimeout(() => {
                    thePlayer.timeOut = thePlayer.timeOut + 1;
                    let i = table.activePlayers.indexOf(thePlayer.username.name);
                    table.activePlayers.splice(i, 1);
                    table.playerChance--;
                    responseString = `${thePlayer.username.name} timed out.`;
                    pvtRoom2.in(table.tableId).emit('timeout', responseString);
                    pvtRoom2.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                    setTimeout(() => {
                        // console.log(table.tableId)
                        getNextActivePlayer(table.tableId);
                    }, 2000)
                }, 25000)
            }
            else {
                setTimeout(() => {
                    getNextActivePlayer(table.tableId);
                }, 3000)
            }
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchPvtRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchPvtRoom(tableID);
        pvtRoom2.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    pvtRoom2.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        pvtRoom2.in(table.tableId).emit('declareWinner', theWinner.username.name);
        pvtRoom2.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        table.potValue = 0;
        var newgame = 5000;
        setTimeout(() => {
            pvtRoom2.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            pvtRoom2.in(table.tableId).emit('reset');
            pvtRoom2.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    pvtRoom2.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    pvtRoom2.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchPvtRoom(tableID);
            if (table.players.length >= 2) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom2.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom2.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom2.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom2.in(table.tableId).emit('restore inc');
            pvtRoom2.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.cardStatus = true;
                    pvtRoom2.in(player).emit('disable blind')
                    pvtRoom2.in(player).emit('display cards', thePlayer.cards);
                    pvtRoom2.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    })
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom2.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            pvtRoom2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom2.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom2.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom2.in(table.tableId).emit('restore inc');
            pvtRoom2.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    })
    socket.on('pack', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        pvtRoom2.in(table.tableId).emit('removeActiveChaal', player);
        pvtRoom2.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchPvtRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            pvtRoom2.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    })
    socket.on('cards open', (tableID, data) => {
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, data);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            pvtRoom2.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                pvtRoom2.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        // console.log(data,thePlayer, thePlayer.cards)
        pvtRoom2.in(data).emit('disable blind')
        pvtRoom2.in(data).emit('display cards', thePlayer.cards);
        pvtRoom2.in(tableID).emit('update status', thePlayer.username.name);
        pvtRoom2.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    })
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom2.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom2.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom2.in(table.tableId).emit('updatePlayer', 'Show', player);

            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            var pos = nextpos ? 0 : 1;
            var pos1 = nextpos ? 1 : 0;
            var theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    })
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchPvtRoom(tableID);
        // console.log(table)
        var thePlayer = getPlayer(table, player);
        thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        // console.log(thePlayer,prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            pvtRoom2.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                pvtRoom2.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                pvtRoom2.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                pvtRoom2.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                pvtRoom2.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                pvtRoom2.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    pvtRoom2.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            pvtRoom2.in(tableID).emit('sideshow error')
        }
    })
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        var preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom2.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        // console.log(thePlayer,prevPlayer)
        var cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        pvtRoom2.in(tableID).emit('sideshow winner', result.id);
        pvtRoom2.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom2.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom2.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        pvtRoom2.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom2.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('invite', function (username, url, tableId, currUser) {
        let newUrl = url + "?tableid=" + tableId;
        console.log(newUrl);
        pvtRoom1.in(username).emit('invite request', newUrl, currUser);
        pvtRoom2.in(username).emit('invite request', newUrl, currUser);
        pvtRoom3.in(username).emit('invite request', newUrl, currUser);
        pvtRoom4.in(username).emit('invite request', newUrl, currUser);
        pvtRoom5.in(username).emit('invite request', newUrl, currUser);
        room.in(username).emit('invite request', newUrl, currUser);
        room2.in(username).emit('invite request', newUrl, currUser);
        room3.in(username).emit('invite request', newUrl, currUser);
        room4.in(username).emit('invite request', newUrl, currUser);
        room5.in(username).emit('invite request', newUrl, currUser);
    })
    socket.on('leave', function (tableID, player) {
        // console.log(tableID,player)
        var table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        console.log(table)
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        pvtRoom2.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player)
            clearTimeout(nomove[tableID]);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        pvtRoom2.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);
    })
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        pvtRoom2.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    })
});

// --------------------PRIVATE ROOM 3------------------------//
pvtRoom3.on('connection', function (socket) {
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchPvtRoom(tableID) {
        for (let i = 0; i < pvtTableArray.length; i++)
            if (pvtTableArray[i].tableId == tableID)
                currentRoom = pvtTableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn, roomName) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        console.log("table id " + tableId);
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        if (pvtTableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn, roomName);
            newTable.addPlayer(newPlayer);
            pvtTableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < pvtTableArray.length; i++) {
                if (pvtTableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < pvtTableArray[pos].players.length; j++) {
                    if (pvtTableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    pvtTableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn, roomName);
                newTable.addPlayer(newPlayer);
                pvtTableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });

    socket.on('fulfill', function (tableID) {
        currentRoom = fetchPvtRoom(tableID);
        pvtRoom3.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchPvtRoom(tableID);
        if (currentRoom.players.length == 1) {
            console.log('if')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom3.in(currUsername).emit('waitforothers');
            activeTable = tableID + "active";
            socket.join(activeTable);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom3.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom3.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            // pushPlayerActive(currentRoom,player);
            pvtRoom3.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom3.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            pvtRoom3.in(currUsername).emit('wait');
        }
    });

    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            if (currentRoom.players.length > 1) {
                for (let i = 0; i < currentRoom.players.length; i++) {
                    if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                        console.log(currentRoom.players[i].currentPocket);
                        var cards;
                        [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                        let flag = 0;
                        for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                            if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                                flag = 1;
                                // console.log("second loop");
                                break;
                            }
                        }
                        if (!flag)
                            currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                        currentRoom.playerChance = 0;
                        currentRoom.players[i].lastMove = null;
                        currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                        currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                        updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                        pvtRoom3.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                        currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                        pvtRoom3.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                        pvtRoom3.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                        currentRoom.players[i].cards = cards;
                        currentRoom.players[i].blindLimit = 4;
                        currentRoom.players[i].cardStatus = false;
                    }
                    else {
                        pvtRoom3.in(currentRoom.players[i].username.name).emit('minByIn');
                    }
                }
                currentRoom.lastMove = true;
                currentRoom.playerChance = 0;
                currentRoom.bootamount = saveBootAmount;
                currentRoom.chalValue = currentRoom.bootamount;
            }
            if (currentRoom.activePlayers.length === 1) {
                pvtRoom3.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                pvtRoom3.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                pvtRoom3.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    pvtRoom3.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }

    function getNextActivePlayer(tableID) {
        var table = fetchPvtRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                pvtRoom3.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            var thePlayerIndex = table.activePlayers[table.playerChance];
            var thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    pvtRoom3.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    pvtRoom3.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchPvtRoom(tableID);
                    if (table.activePlayers.length > 2)
                        pvtRoom3.in(thePlayer.username.name).emit('active side show');
                }
            }
            if (thePlayer) {
                console.log("player name " + thePlayer.username.name)
                pvtRoom3.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
                nomove[tableID] = setTimeout(() => {
                    thePlayer.timeOut = thePlayer.timeOut + 1;
                    let i = table.activePlayers.indexOf(thePlayer.username.name);
                    table.activePlayers.splice(i, 1);
                    table.playerChance--;
                    responseString = `${thePlayer.username.name} timed out.`;
                    pvtRoom3.in(table.tableId).emit('timeout', responseString);
                    pvtRoom3.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                    setTimeout(() => {
                        // console.log(table.tableId)
                        getNextActivePlayer(table.tableId);
                    }, 3000)
                }, 25000)
            }
            else {
                setTimeout(() => {
                    getNextActivePlayer(table.tableId);
                }, 3000)
            }
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchPvtRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchPvtRoom(tableID);
        pvtRoom3.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    pvtRoom3.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        pvtRoom3.in(table.tableId).emit('declareWinner', theWinner.username.name);
        pvtRoom3.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        table.potValue = 0;
        var newgame = 5000;
        setTimeout(() => {
            pvtRoom3.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            pvtRoom3.in(table.tableId).emit('reset');
            pvtRoom3.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    pvtRoom3.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    pvtRoom3.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchPvtRoom(tableID);
            if (table.players.length >= 2) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom3.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom3.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom3.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom3.in(table.tableId).emit('restore inc');
            pvtRoom3.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.cardStatus = true;
                    pvtRoom3.in(player).emit('disable blind')
                    pvtRoom3.in(player).emit('display cards', thePlayer.cards);
                    pvtRoom3.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    })
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom3.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            pvtRoom3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom3.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom3.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom3.in(table.tableId).emit('restore inc');
            pvtRoom3.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    })
    socket.on('pack', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        pvtRoom3.in(table.tableId).emit('removeActiveChaal', player);
        pvtRoom3.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchPvtRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            pvtRoom3.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    })
    socket.on('cards open', (tableID, data) => {
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, data);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            pvtRoom3.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                pvtRoom3.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        // console.log(data,thePlayer, thePlayer.cards)
        pvtRoom3.in(data).emit('disable blind')
        pvtRoom3.in(data).emit('display cards', thePlayer.cards);
        pvtRoom3.in(tableID).emit('update status', thePlayer.username.name)
        pvtRoom3.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    })
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom3.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom3.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom3.in(table.tableId).emit('updatePlayer', 'Show', player);
            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            var pos = nextpos ? 0 : 1;
            var pos1 = nextpos ? 1 : 0;
            var theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    })
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchPvtRoom(tableID);
        // console.log(table)
        var thePlayer = getPlayer(table, player);
        thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        // console.log(thePlayer,prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            pvtRoom3.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                pvtRoom3.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                pvtRoom3.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                pvtRoom3.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                pvtRoom3.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                pvtRoom3.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    pvtRoom3.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            pvtRoom3.in(tableID).emit('sideshow error')
        }
    })
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        var preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom3.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        // console.log(thePlayer,prevPlayer)
        var cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        pvtRoom3.in(tableID).emit('sideshow winner', result.id);
        pvtRoom3.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom3.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })

    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom3.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        pvtRoom3.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom3.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })

    socket.on('invite', function (username, url, tableId, currUser) {
        let newUrl = url + "?tableid=" + tableId;
        console.log("link " + url);
        pvtRoom1.in(username).emit('invite request', newUrl, currUser);
        pvtRoom2.in(username).emit('invite request', newUrl, currUser);
        pvtRoom3.in(username).emit('invite request', newUrl, currUser);
        pvtRoom4.in(username).emit('invite request', newUrl, currUser);
        pvtRoom5.in(username).emit('invite request', newUrl, currUser);
        room.in(username).emit('invite request', newUrl, currUser);
        room2.in(username).emit('invite request', newUrl, currUser);
        room3.in(username).emit('invite request', newUrl, currUser);
        room4.in(username).emit('invite request', newUrl, currUser);
        room5.in(username).emit('invite request', newUrl, currUser);
    })
    socket.on('leave', function (tableID, player) {
        // console.log(tableID,player)
        var table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        console.log(table)
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        pvtRoom3.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player)
            clearTimeout(nomove[tableID]);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        pvtRoom3.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);

    })
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        pvtRoom3.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    })
});

// --------------------PRIVATE ROOM 4------------------------//
pvtRoom4.on('connection', function (socket) {
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchPvtRoom(tableID) {
        for (let i = 0; i < pvtTableArray.length; i++)
            if (pvtTableArray[i].tableId == tableID)
                currentRoom = pvtTableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        if (pvtTableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            pvtTableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < pvtTableArray.length; i++) {
                if (pvtTableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < pvtTableArray[pos].players.length; j++) {
                    if (pvtTableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    pvtTableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                pvtTableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });

    socket.on('fulfill', function (tableID) {
        currentRoom = fetchPvtRoom(tableID);
        pvtRoom4.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchPvtRoom(tableID);
        if (currentRoom.players.length == 1) {
            console.log('if')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom4.in(currUsername).emit('waitforothers');
            activeTable = tableID + "active";
            socket.join(activeTable);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom4.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom4.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            // pushPlayerActive(currentRoom,player);
            pvtRoom4.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom4.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            pvtRoom4.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            if (currentRoom.players.length > 1) {
                for (let i = 0; i < currentRoom.players.length; i++) {
                    if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                        console.log(currentRoom.players[i].currentPocket);
                        var cards;
                        [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                        let flag = 0;
                        for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                            if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                                flag = 1;
                                break;
                            }
                        }
                        if (!flag)
                            currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                        currentRoom.playerChance = 0;
                        currentRoom.players[i].lastMove = null;
                        currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                        currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                        updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                        pvtRoom4.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                        currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                        pvtRoom4.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                        pvtRoom4.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                        currentRoom.players[i].cards = cards;
                        currentRoom.players[i].blindLimit = 4;
                        currentRoom.players[i].cardStatus = false;
                    }
                    else {
                        pvtRoom4.in(currentRoom.players[i].username.name).emit('minByIn');
                    }
                }
                currentRoom.lastMove = true;
                currentRoom.playerChance = 0;
                currentRoom.bootamount = saveBootAmount;
                currentRoom.chalValue = currentRoom.bootamount;
            }
            if (currentRoom.activePlayers.length === 1) {
                pvtRoom4.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                pvtRoom4.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                pvtRoom4.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    pvtRoom4.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }

    function getNextActivePlayer(tableID) {
        var table = fetchPvtRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                pvtRoom4.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            var thePlayerIndex = table.activePlayers[table.playerChance];
            var thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    pvtRoom4.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    pvtRoom4.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchPvtRoom(tableID);
                    if (table.activePlayers.length > 2)
                        pvtRoom4.in(thePlayer.username.name).emit('active side show');
                }
            }
            if (thePlayer) {
                console.log("player name " + thePlayer.username.name)
                pvtRoom4.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
                nomove[tableID] = setTimeout(() => {
                    thePlayer.timeOut = thePlayer.timeOut + 1;
                    let i = table.activePlayers.indexOf(thePlayer.username.name);
                    table.activePlayers.splice(i, 1);
                    table.playerChance--;
                    responseString = `${thePlayer.username.name} timed out.`;
                    pvtRoom4.in(table.tableId).emit('timeout', responseString)
                    pvtRoom4.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                    setTimeout(() => {
                        // console.log(table.tableId)
                        getNextActivePlayer(table.tableId);
                    }, 2000)
                }, 25000)
            }
            else {
                setTimeout(() => {
                    getNextActivePlayer(table.tableId);
                }, 3000)
            }
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchPvtRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchPvtRoom(tableID);
        pvtRoom4.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    pvtRoom4.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        pvtRoom4.in(table.tableId).emit('declareWinner', theWinner.username.name);
        pvtRoom4.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        table.potValue = 0;
        var newgame = 5000;
        setTimeout(() => {
            pvtRoom4.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            pvtRoom4.in(table.tableId).emit('reset');
            pvtRoom4.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    pvtRoom4.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    pvtRoom4.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchPvtRoom(tableID);
            if (table.players.length >= 2) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom4.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom4.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom4.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom4.in(table.tableId).emit('restore inc');
            pvtRoom4.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.cardStatus = true;
                    pvtRoom4.in(player).emit('disable blind')
                    pvtRoom4.in(player).emit('display cards', thePlayer.cards);
                    pvtRoom4.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    })
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom4.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            pvtRoom4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom4.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom4.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom4.in(table.tableId).emit('restore inc');
            pvtRoom4.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    })
    socket.on('pack', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        pvtRoom4.in(table.tableId).emit('removeActiveChaal', player);
        pvtRoom4.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchPvtRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            pvtRoom4.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    })
    socket.on('cards open', (tableID, data) => {
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, data);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            pvtRoom4.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                pvtRoom4.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        // console.log(data,thePlayer, thePlayer.cards)
        pvtRoom4.in(data).emit('disable blind')
        pvtRoom4.in(data).emit('display cards', thePlayer.cards);
        pvtRoom4.in(tableID).emit('update status', thePlayer.username.name);
        pvtRoom4.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    })
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom4.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom4.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom4.in(table.tableId).emit('updatePlayer', 'Show', player);

            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            var pos = nextpos ? 0 : 1;
            var pos1 = nextpos ? 1 : 0;
            var theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    })
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchPvtRoom(tableID);
        // console.log(table)
        var thePlayer = getPlayer(table, player);
        thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        // console.log(thePlayer,prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            pvtRoom4.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                pvtRoom4.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                pvtRoom4.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                pvtRoom4.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                pvtRoom4.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                pvtRoom4.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    pvtRoom4.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            pvtRoom4.in(tableID).emit('sideshow error')
        }
    })
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        var preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom4.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        // console.log(thePlayer,prevPlayer)
        var cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        pvtRoom4.in(tableID).emit('sideshow winner', result.id);
        pvtRoom4.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom4.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom4.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        pvtRoom4.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom4.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('invite', function (username, url, tableId, currUser) {
        let newUrl = url + "?tableid=" + tableId;
        console.log(newUrl);
        pvtRoom1.in(username).emit('invite request', newUrl, currUser);
        pvtRoom2.in(username).emit('invite request', newUrl, currUser);
        pvtRoom3.in(username).emit('invite request', newUrl, currUser);
        pvtRoom4.in(username).emit('invite request', newUrl, currUser);
        pvtRoom5.in(username).emit('invite request', newUrl, currUser);
        room.in(username).emit('invite request', newUrl, currUser);
        room2.in(username).emit('invite request', newUrl, currUser);
        room3.in(username).emit('invite request', newUrl, currUser);
        room4.in(username).emit('invite request', newUrl, currUser);
        room5.in(username).emit('invite request', newUrl, currUser);
    })
    socket.on('leave', function (tableID, player) {
        // console.log(tableID,player)
        var table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        console.log(table)
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        pvtRoom4.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player)
            clearTimeout(nomove[tableID]);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        pvtRoom4.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);

    })
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        pvtRoom4.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    })
});

// --------------------PRIVATE ROOM 5------------------------//
pvtRoom5.on('connection', function (socket) {
    var newTable, newPlayer, tableRoom, currentRoom, saveBootAmount;
    function fetchPvtRoom(tableID) {
        for (let i = 0; i < pvtTableArray.length; i++)
            if (pvtTableArray[i].tableId == tableID)
                currentRoom = pvtTableArray[i];
        return currentRoom;
    }
    function findIfPlayerExists(table, player) {
        for (let i = 0; i < table.activePlayers.length; i++)
            if (table.activePlayers[i] === player)
                return table.activePlayers[i];
        return null;
    }
    function getPlayer(table, name) {
        if (table.players != undefined) {
            for (let i = 0; i < table.players.length; i++)
                if (table.players[i].username.name === name)
                    return table.players[i];
        }
    }
    function pushPlayerActive(table, player) {
        let flag = 0;
        for (let j = 0; j < table.players.length; j++) {
            if (table.activePlayers[j] === player) {
                flag = 1;
                break;
            }
        }
        if (!flag)
            table.addActivePlayer(player);
    }
    socket.on('create', function (tableId, currUserID, currUsername, bootamount, potLimit, currentPocket, currUserType, minBuyIn) {
        socket.username = currUsername;
        socket.room = tableId;
        saveBootAmount = bootamount;
        newPlayer = new client(currUserID, currUsername, currentPocket, currUserType);
        if (pvtTableArray.length === 0) {
            newTable = new table(tableId, bootamount, potLimit, minBuyIn);
            newTable.addPlayer(newPlayer);
            pvtTableArray.push(newTable);
        }
        else {
            tableFlag = 0, pos = 0;
            for (let i = 0; i < pvtTableArray.length; i++) {
                if (pvtTableArray[i].tableId === tableId) {
                    tableFlag = 1;
                    pos = i;
                    break;
                }
            }
            if (tableFlag) {
                let flag = 0;
                console.log("\n------------------------Into if")
                for (let j = 0; j < pvtTableArray[pos].players.length; j++) {
                    if (pvtTableArray[pos].players[j].username.name === newPlayer.username.name) {
                        flag = 1;
                        break;
                    }
                }
                if (!flag)
                    pvtTableArray[pos].addPlayer(newPlayer);
            }
            else {
                console.log("\n------------------------Into else")
                newTable = new table(tableId, bootamount, potLimit, minBuyIn);
                newTable.addPlayer(newPlayer);
                pvtTableArray.push(newTable);
            }
        }

        console.log('create')
        socket.join(tableId)
        socket.join(currUsername)
    });

    socket.on('fulfill', function (tableID) {
        currentRoom = fetchPvtRoom(tableID);
        pvtRoom5.in(currentRoom.tableId).emit('populate', currentRoom);
    });
    socket.on('gamejoin', function (tableID, currUsername) {
        currentRoom = fetchPvtRoom(tableID);
        if (currentRoom.players.length == 1) {
            console.log('if')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom5.in(currUsername).emit('waitforothers');
            activeTable = tableID + "active";
            socket.join(activeTable);
        }
        else if ((currentRoom.activePlayers.length === 1 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('if else')
            pushPlayerActive(currentRoom, currUsername);
            pvtRoom5.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom5.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus) {
            console.log('else if')
            pushPlayerActive(currentRoom, currUsername);
            // pushPlayerActive(currentRoom,player);
            pvtRoom5.in(tableID).emit('joined');
            currentRoom.gameStatus = true;
            let newgame = 5000;
            pvtRoom5.in(currentRoom.tableId).emit('new game', newgame);
            setGameBegin[tableID] = setTimeout(() => {
                currentRoom = fetchPvtRoom(tableID)
                if (currentRoom.players.length > 1) {
                    activeTable = tableID + "active";
                    socket.join(activeTable);
                    gameBegin(currentRoom, activeTable);
                    clearTimeout(setGameBegin[tableID]);
                } else
                    currentRoom.gameStatus = false;
            }, newgame);
        }
        else if ((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus) {
            pvtRoom5.in(currUsername).emit('wait');
        }
    });
    function gameBegin(currentRoom, activeTableID) {
        if (currentRoom.players.length > 1) {
            clearTimeout(setGameBegin[currentRoom.tableId]);
            currentRoom.gameStatus = true;
            let allRandCards = {};
            if (currentRoom.players.length > 1) {
                for (let i = 0; i < currentRoom.players.length; i++) {
                    if (currentRoom.players[i].currentPocket >= currentRoom.minBuyIn) {
                        console.log(currentRoom.players[i].currentPocket);
                        var cards;
                        [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
                        let flag = 0;
                        for (let j = 0; j < currentRoom.activePlayers.length; j++) {
                            if (currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                                flag = 1;
                                // console.log("second loop");
                                break;
                            }
                        }
                        if (!flag)
                            currentRoom.addActivePlayer(currentRoom.players[i].username.name);
                        currentRoom.playerChance = 0;
                        currentRoom.players[i].lastMove = null;
                        currentRoom.players[i].totalExpend = -currentRoom.bootamount;
                        currentRoom.players[i].currentPocket = parseInt(currentRoom.players[i].currentPocket) - parseInt(currentRoom.bootamount);
                        updateUserCredit(currentRoom.players[i].username.name, currentRoom.players[i].totalExpend, currentRoom.players[i].userType);
                        pvtRoom5.in(currentRoom.tableId).emit('updatebalance', currentRoom.players[i].username.name, currentRoom.players[i].currentPocket);
                        currentRoom.potValue = parseInt(currentRoom.potValue) + parseInt(currentRoom.bootamount);
                        pvtRoom5.in(currentRoom.tableId).emit('updatePotvalue', currentRoom.potValue, currentRoom.bootamount, currentRoom.players[i].username.name);
                        pvtRoom5.in(currentRoom.tableId).emit('updatePlayer', 'Boot', currentRoom.players[i].username.name);
                        currentRoom.players[i].cards = cards;
                        currentRoom.players[i].blindLimit = 4;
                        currentRoom.players[i].cardStatus = false;
                    }
                    else {
                        pvtRoom5.in(currentRoom.players[i].username.name).emit('minByIn');
                    }
                }
                currentRoom.lastMove = true;
                currentRoom.playerChance = 0;
                currentRoom.bootamount = saveBootAmount;
                currentRoom.chalValue = currentRoom.bootamount;
            }
            if (currentRoom.activePlayers.length === 1) {
                pvtRoom5.in(currentRoom.activePlayers[0]).emit('waitforothers');
            }
            else {
                pvtRoom5.in(currentRoom.tableId).emit('gamebegins', 'The game begins!');
                pvtRoom5.in(currentRoom.tableId).emit('card shuffle');
                // table.potValue = table.bootamount * currentRoom.players.length;
                var clear = currentRoom.activePlayers.length * 600 + 200;
                setTimeout(() => {
                    pvtRoom5.in(currentRoom.tableId).emit('reset pot');
                    getNextActivePlayer(currentRoom.tableId);
                }, clear)
            }
        } else {
            currentRoom.gameStatus = false;
        }
    }

    function getNextActivePlayer(tableID) {
        var table = fetchPvtRoom(tableID);
        if (table.activePlayers.length === 0) {
            return;
        }
        else if (table.activePlayers.length === 1) {
            console.log("getting in if");
            gameOver(tableID);
        } else {
            if (table.activePlayers.length === 2)
                pvtRoom5.in(tableID).emit('active show');
            if (table.playerChance >= table.activePlayers.length) {
                table.playerChance = 0;
            }
            var thePlayerIndex = table.activePlayers[table.playerChance];
            var thePlayer = getPlayer(table, thePlayerIndex);
            table.playerTurn = thePlayer.username.name;
            if (table.lastMove) {
                if (thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) * 2;
                    room.in(table.tableId).emit('updateChaalValue', table.chalValue);
                }
            }
            else {
                if (!thePlayer.cardStatus) {
                    table.chalValue = parseInt(table.chalValue) / 2;
                    room.in(table.tableId).emit('updateChaalValue', table.chalValue);
                } else {
                    table = fetchPvtRoom(tableID);
                    if (table.activePlayers.length > 2)
                        pvtRoom5.in(thePlayer.username.name).emit('active side show');
                }
            }
            if (thePlayer) {
                console.log("player name " + thePlayer.username.name)
                pvtRoom5.in(table.tableId).emit('activeChaal', thePlayer.username.name, table.chalValue);
                nomove[tableID] = setTimeout(() => {
                    thePlayer.timeOut = thePlayer.timeOut + 1;
                    let i = table.activePlayers.indexOf(thePlayer.username.name);
                    table.activePlayers.splice(i, 1);
                    table.playerChance--;
                    responseString = `${thePlayer.username.name} timed out.`;
                    pvtRoom5.in(table.tableId).emit('timeout', responseString)
                    pvtRoom5.in(table.tableId).emit('updatePlayer', 'Timed out', thePlayer.username.name);
                    setTimeout(() => {
                        // console.log(table.tableId)
                        getNextActivePlayer(table.tableId);
                    }, 2000)
                }, 25000)
            }
            else {
                setTimeout(() => {
                    getNextActivePlayer(table.tableId);
                }, 3000)
            }
            table.playerChance++;
        }
    }
    function compared(tableID) {
        var table = fetchPvtRoom(tableID);
        allActivePlayers = [];
        cardSet = [];
        for (var player in table.activePlayers) {
            temp = getPlayer(table, table.activePlayers[player])
            // console.log(player,"\t",temp)
            allActivePlayers.push(temp);
        }
        for (let i = 0; i < allActivePlayers.length; i++) {
            cardSet.push({
                id: allActivePlayers[i].username.name,
                set: allActivePlayers[i].cards
            });
        }
        result = cardComparer.getGreatest(cardSet);
        // console.log(result)
        return result;
    }
    function gameOver(tableID) {
        clearTimeout(nomove[tableID])
        var table = fetchPvtRoom(tableID);
        pvtRoom5.in(tableID).emit('remove action-bar');
        table.playerTurn = null;
        if (table.activePlayers.length >= 2) {
            winner = compared(tableID);
            theWinner = getPlayer(table, winner.id);
        }
        else
            theWinner = getPlayer(table, table.activePlayers[0]);
        console.log(currentRoom.activePlayers.length)
        if (total[tableID] > 1 || table.activePlayers.length > 1) {
            for (let i = 0; i < table.players.length; i++) {
                if (table.players[i].cards) {
                    pvtRoom5.in(table.tableId).emit('display cards game over', table.players[i].cards, table.players[i].username.name);
                }
            }
        }
        pvtRoom5.in(table.tableId).emit('declareWinner', theWinner.username.name);
        pvtRoom5.in(table.tableId).emit('removeActiveChaal', theWinner.username.name);
        //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
        theWinner.totalExpend = parseInt(table.potValue) - (0.15 * parseInt(table.potValue))
        theAdminRevenue = (0.15 * parseInt(table.potValue));
        theWinner.totalExpend = parseInt(theWinner.totalExpend);
        console.log("after admin commission  " + theWinner.totalExpend)
        theAdminRevenue = parseInt(theAdminRevenue);
        console.log("admin's revenue  " + theAdminRevenue)
        updateAdminRevenue(theAdminRevenue);
        theWinner.currentPocket = parseInt(theWinner.currentPocket) + parseInt(theWinner.totalExpend);
        theWinner.currentPocket = parseInt(theWinner.currentPocket);
        updateUserCredit(theWinner.username.name, theWinner.totalExpend, theWinner.userType);
        table.potValue = 0;
        var newgame = 5000;
        setTimeout(() => {
            pvtRoom5.in(table.tableId).emit('updatebalance', theWinner.username.name, theWinner.currentPocket);
            pvtRoom5.in(table.tableId).emit('reset');
            pvtRoom5.in(table.tableId).emit('new game', newgame);
            for (let i = 0; i <= table.activePlayers.length; i++) {
                if (table.players[i].currentPocket < table.minBuyIn) {
                    pvtRoom5.in(table.players[i].username.name).emit('minByIn');
                }
            }
            for (let i = 1; i <= table.players.length; i++) {
                if (table.players[i - 1].timeOut >= 2) {
                    pvtRoom5.in(table.players[i - 1].username.name).emit('force leave');
                }
            }
        }, 7000);
        setGameBegin[tableID] = setTimeout(() => {
            table = fetchPvtRoom(tableID);
            if (table.players.length >= 2) {
                console.log("call gamebegin");
                gameBegin(table, tableID);
                clearTimeout(setGameBegin[tableID]);
            } else
                table.gameStatus = false;
        }, newgame + 7000);
    }
    socket.on('blind', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom5.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            table.chalValue = parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom5.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom5.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom5.in(table.tableId).emit('restore inc');
            pvtRoom5.in(table.tableId).emit('updatePlayer', 'Blind', player);
            thePlayer.lastMove = 'Blind';
            table.lastMove = true;
            if (table.potValue >= parseInt(table.potLimit)) {
                console.log("in this if hahahaahahhaha")
                gameOver(tableID);
            } else {
                if (thePlayer.blindLimit !== 1) {
                    thePlayer.blindLimit--;
                }
                else {
                    thePlayer.cardStatus = true;
                    pvtRoom5.in(player).emit('disable blind')
                    pvtRoom5.in(player).emit('display cards', thePlayer.cards);
                    pvtRoom5.in(tableID).emit('update status', thePlayer.username.name)
                }
                getNextActivePlayer(tableID);
            }
        }

    })
    socket.on('chaal', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom5.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            console.log("chaal by " + player)
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            table.chalValue = parseInt(data);
            pvtRoom5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom5.in(table.tableId).emit('updateChaalValue', table.chalValue);
            pvtRoom5.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom5.in(table.tableId).emit('restore inc');
            pvtRoom5.in(table.tableId).emit('updatePlayer', 'Chaal', player);
            thePlayer.lastMove = 'Chaal';
            table.lastMove = false;
            if (table.potValue >= parseInt(table.potLimit)) {
                gameOver(tableID);
            } else {
                getNextActivePlayer(tableID);
            }
        }
    })
    socket.on('pack', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        for (var i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
                table.playerChance--;
            }
        }
        pvtRoom5.in(table.tableId).emit('removeActiveChaal', player);
        pvtRoom5.in(table.tableId).emit('updatePlayer', 'Packed', player);
        table = fetchPvtRoom(tableID);
        total[tableID] = table.activePlayers.length;
        if (thePlayer.currentPocket < table.minBuyIn) {
            pvtRoom5.in(thePlayer.username.name).emit('minByIn');
        }
        getNextActivePlayer(tableID);
    })
    socket.on('cards open', (tableID, data) => {
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, data);
        if (thePlayer.username.name == table.playerTurn) {
            table.chalValue = parseInt(table.chalValue) * 2;
            pvtRoom5.in(table.tableId).emit('updateChaalValue', table.chalValue);
            if (!table.lastMove && table.activePlayers.length > 2)
                pvtRoom5.in(thePlayer.username.name).emit('active side show');
        }
        thePlayer.cardStatus = true;
        // console.log(data,thePlayer, thePlayer.cards)
        pvtRoom5.in(data).emit('disable blind')
        pvtRoom5.in(data).emit('display cards', thePlayer.cards);
        pvtRoom5.in(tableID).emit('update status', thePlayer.username.name);
        pvtRoom5.in(table.tableId).emit('updatePlayer', 'Card Seen', thePlayer.username.name);
    })
    socket.on('show time', function (data, tableID, player) {
        clearTimeout(nomove[tableID]);
        let table = fetchPvtRoom(tableID);
        let thePlayer = getPlayer(table, player);
        total[tableID] = table.activePlayers.length;
        // thePlayer.timeOut = 0;
        if (parseInt(thePlayer.currentPocket) < parseInt(data))
            pvtRoom5.in(player).emit('low balance');
        else {
            table.potValue = parseInt(table.potValue) + parseInt(data);
            thePlayer.totalExpend = - parseInt(data);
            thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
            updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
            pvtRoom5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
            pvtRoom5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
            pvtRoom5.in(table.tableId).emit('removeActiveChaal', player);
            pvtRoom5.in(table.tableId).emit('updatePlayer', 'Show', player);

            for (let i = 0; i < table.activePlayers.length; i++)
                if (table.activePlayers[i] !== player) {
                    nextplayer = table.activePlayers[i];
                    nextpos = i;
                    break;
                }
            let pos = nextpos ? 0 : 1;
            let pos1 = nextpos ? 1 : 0;
            let theOtherPlayer = getPlayer(table, nextplayer);
            cardsToCompare = [
                {
                    id: pos1,
                    set: thePlayer.cards
                },
                {
                    id: pos,
                    set: theOtherPlayer.cards
                }
            ]
            result = cardComparer.getGreatest(cardsToCompare);
            table.activePlayers.splice(result.id, 1);
            gameOver(tableID);
        }
    })
    socket.on('sideshow', function (data, tableID, player) {
        var table = fetchPvtRoom(tableID);
        // console.log(table)
        var thePlayer = getPlayer(table, player);
        thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        if (i == 0)
            pos = table.activePlayers.length - 1;
        else
            pos = i - 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        // console.log(thePlayer,prevPlayer)
        if (thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
            clearTimeout(nomove[tableID]);
            pvtRoom5.in(thePlayer.username.name).emit('remove action-bar');
            if (parseInt(thePlayer.currentPocket) < parseInt(data))
                pvtRoom5.in(player).emit('low balance');
            else {
                table.potValue = parseInt(table.potValue) + parseInt(data);
                thePlayer.totalExpend = - parseInt(data);
                thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
                updateUserCredit(player, thePlayer.totalExpend, thePlayer.userType);
                table.chalValue = parseInt(data);
                thePlayer.lastMove = 'Chaal';
                table.lastMove = false;
                pvtRoom5.in(table.tableId).emit('updatebalance', player, thePlayer.currentPocket);
                pvtRoom5.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name, data);
                pvtRoom5.in(table.tableId).emit('updatePotvalue', table.potValue, data, player);
                pvtRoom5.in(table.tableId).emit('updatePlayer', 'Side Show', player);
                setSideShow[tableID] = setTimeout(() => {
                    pvtRoom5.in(table.tableId).emit('remove sideshow req');
                    getNextActivePlayer(tableID);
                }, 10000)
            }
        }
        else {
            pvtRoom5.in(tableID).emit('sideshow error')
        }
    })
    socket.on('accept', function (tableID, player) {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        var preStatus = 'accept';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom5.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        // console.log(thePlayer,prevPlayer)
        var cardsToCompare = [
            {
                id: thePlayer.username.name,
                set: thePlayer.cards
            },
            {
                id: prevPlayer.username.name,
                set: prevPlayer.cards
            }
        ]
        result = cardComparer.getGreatest(cardsToCompare);
        for (let j = 0; j < table.activePlayers.length; j++) {
            if (table.activePlayers[j] === thePlayer.username.name || table.activePlayers[j] === prevPlayer.username.name) {
                if (table.activePlayers[j] !== result.id) table.activePlayers.splice(j, 1);
            }
        }
        if (result.id != thePlayer.username.name) {
            status = 'Packed';
        }
        else {
            preStatus = 'Packed';
        }
        pvtRoom5.in(tableID).emit('sideshow winner', result.id);
        pvtRoom5.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom5.in(table.tableId).emit('updatePlayer', preStatus, prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('reject', (tableID, player) => {
        clearTimeout(setSideShow[tableID]);
        var table = fetchPvtRoom(tableID);
        var thePlayer = getPlayer(table, player);
        // thePlayer.timeOut = 0;
        var i = table.activePlayers.indexOf(player);
        var status = 'Chaal';
        if (i == table.activePlayers.length - 1)
            pos = 0;
        else
            pos = i + 1;
        var prevPlayer = getPlayer(table, table.activePlayers[pos]);
        pvtRoom5.in(prevPlayer.username.name).emit('sideshow reject', thePlayer.username.name);
        pvtRoom5.in(table.tableId).emit('updatePlayer', status, player);
        pvtRoom5.in(table.tableId).emit('updatePlayer', 'denied', prevPlayer.username.name);
        getNextActivePlayer(tableID);
    })
    socket.on('invite', function (username, url, tableId, currUser) {
        let newUrl = url + "?tableid=" + tableId;
        console.log(newUrl);
        pvtRoom1.in(username).emit('invite request', newUrl, currUser);
        pvtRoom2.in(username).emit('invite request', newUrl, currUser);
        pvtRoom3.in(username).emit('invite request', newUrl, currUser);
        pvtRoom4.in(username).emit('invite request', newUrl, currUser);
        pvtRoom5.in(username).emit('invite request', newUrl, currUser);
        room.in(username).emit('invite request', newUrl, currUser);
        room2.in(username).emit('invite request', newUrl, currUser);
        room3.in(username).emit('invite request', newUrl, currUser);
        room4.in(username).emit('invite request', newUrl, currUser);
        room5.in(username).emit('invite request', newUrl, currUser);
    })
    socket.on('leave', function (tableID, player) {
        // console.log(tableID,player)
        let table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        console.log(table)
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        pvtRoom5.in(table.tableId).emit('remove', table, player);
        if (table.playerTurn === player)
            clearTimeout(nomove[tableID]);
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            table.playerChance--;
            getNextActivePlayer(tableID)
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            clearTimeout(nomove[tableID]);
            gameOver(tableID);
        }
        pvtRoom5.in(player).emit('redirect', '/game')
        socket.leave(tableID);
        socket.leave(player);

    })
    socket.on('disconnect', () => {
        let tableID = socket.room;
        let player = socket.username;
        let table = fetchPvtRoom(tableID);
        let gameroom = gameRoute.fetchPvtRoom(tableID);
        if (table.playerTurn === player || table.activePlayers.length <= 2) {
            clearTimeout(nomove[tableID]);
        }
        for (let i = 0; i < table.players.length; i++) {
            if (table.players[i].username.name === player) {
                table.players.splice(i, 1);
            }
        }
        for (let i = 0; i < gameroom.players.length; i++) {
            if (gameroom.players[i] === player) {
                gameroom.players.splice(i, 1);
            }
        }
        for (let i = 0; i < table.activePlayers.length; i++) {
            if (table.activePlayers[i] === player) {
                table.activePlayers.splice(i, 1);
            }
        }
        if (table.playerTurn === player && table.activePlayers.length > 1) {
            console.log("leave get next")
            table.playerChance--;
            getNextActivePlayer(tableID);
        }
        else if (table.activePlayers.length === 1 && table.playerTurn !== null) {
            console.log("leave game over");
            gameOver(tableID);
        }
        pvtRoom5.in(table.tableId).emit('remove', table, player);
        socket.leave(tableID);
        socket.leave(player);
    })
});

server.listen(process.env.PORT || 4400, function () {
    console.log('Server is live');
});
