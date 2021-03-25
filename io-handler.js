const { EventEmitter } = require('events');
const url = require('url');

const eventEmitter = new EventEmitter();
const namespacesCreated = {};

const routes = {
  chat: /game\/private\/(\d+)/,
};

const ee = new EventEmitter();
// const namespacesCreated = {}; // will store the existing namespaces
// console.log("io");
module.exports = (io) => {
  
  io.sockets.on('connection', (socket) => {
    // console.log("io")
    const { ns } = url.parse(socket.handshake.url, true).query;
    let matched = false;
    console.log(ns)
    if (!ns) { // if there is not a ns in query disconnect the socket
      socket.disconnect();
      console.log("disconnect")
      return { err: 'ns not provided' };
    }

    Object.keys(routes).forEach((name) => {
      const matches = ns.match(routes[name]);
      console.log("connect")
      if (matches) {
        matched = true;
        if (!namespacesCreated[ns]) { // check if the namespace was already created
          namespacesCreated[ns] = true;
          io.of(ns).on('connection', (nsp) => {
            const evt = `dynamic.group.${name}`; // emit an event four our group of namespaces
            ee.emit(evt, nsp, ...matches.slice(1, matches.length));
          });
        }
      }
    });

    if (!matched) { // if there was no match disconnect the socket
      socket.disconnect();
    }
  });

  return ee; // we can return the EventEmitter to be used in our server.js file
};

ee.on('dynamic.group.chat', (socket, categoryId, itemId) => {
  // implement your chat logic
  console.log("io");
  var newTable, newPlayer, tableRoom, currentRoom;
  function fetchRoom(tableID) {
      for(let i=0;i<tableArray.length;i++)
          if(tableArray[i].tableId == tableID)
              currentRoom = tableArray[i];
      return currentRoom;
  }
  function findIfPlayerExists(table, player) {
      for(let i = 0;i<table.activePlayers.length; i++)
          if(table.activePlayers[i]===player)
              return table.activePlayers[i];
      return null;
  }
  function getPlayer(table,name) {
      for(let i=0;i<table.players.length; i++)
          if(table.players[i].username.name === name)
              return table.players[i];
  }
  function pushPlayerActive(table, player) {
      let flag = 0;
      for(let j = 0; j<table.players.length; j++) {
          if(table.activePlayers[j] === player) {
              flag = 1;
              break;
          }
      }
      if(!flag)
          table.addActivePlayer(player);
  }
  socket.on('create', function(tableId,currUserID,currUsername,bootamount,potLimit, currentPocket, currUserType){
      socket.username =  currUsername;
      socket.room =  tableId;
      saveBootAmount = bootamount;
      // console.log('create')
      newPlayer  = new client(currUserID,currUsername, currentPocket, currUserType);
      computer = new client('1', 'sadik', '500000', 'user')
      // if(tableArray.length <= 0){
      //     newTable = new table(tableId,bootamount,potLimit);
      //     newTable.addPlayer(computer);
      //     tableArray.push(newTable);
      // }
      if(tableArray.length === 0) {
          newTable = new table(tableId,bootamount,potLimit);
          newTable.addPlayer(newPlayer);
          newTable.addPlayer(computer);
          tableArray.push(newTable);
      }
      else {
          tableFlag = 0,pos = 0;
          for( let i = 0; i< tableArray.length; i++) {
              if(tableArray[i].tableId === tableId) {
                  tableFlag = 1;
                  pos = i;
                  break;
              }
          }
          if(tableFlag) {
              let flag = 0;
                  console.log("\n------------------------Into if")
                  for(let j = 0; j<tableArray[pos].players.length; j++) {
                      if(tableArray[pos].players[j].username.name === newPlayer.username.name) {
                          flag = 1;
                          break;
                      }
                  }
                  if(!flag)
                      tableArray[pos].addPlayer(newPlayer);
                      tableArray[pos].addPlayer(computer);
          }
          else {
              console.log("\n------------------------Into else")
              newTable = new table(tableId,bootamount,potLimit);
              newTable.addPlayer(newPlayer);
              newTable.addPlayer(computer);
              tableArray.push(newTable);
          }
      }
  
      console.log('create')
      socket.join(tableId)
      socket.join(currUsername)
  });
  
  socket.on('fulfill', function(tableID) {
      currentRoom = fetchRoom(tableID);
      room.in(currentRoom.tableId).emit('populate', currentRoom);
  });
  socket.on('gamejoin', function(tableID, currUsername) { ``
      currentRoom = fetchRoom(tableID);
      player = 'sadik'
      currentRoom.gameStatus = true;
      pushPlayerActive(currentRoom,currUsername);
      console.log("current userName  " + currUsername)
          if(currentRoom.players.length === 1) {
              console.log('if')
              pushPlayerActive(currentRoom,currUsername);
              // pushPlayerActive(currentRoom,player);
              room.in(tableID).emit('joined');
              currentRoom.gameStatus = true;
              room.in(currUsername).emit('waitforothers');
              activeTable = tableID+"active";
              socket.join(activeTable);
          }
          else if(currentRoom.activePlayers.length === 1) {
              console.log('if else')
              pushPlayerActive(currentRoom, currUsername);
              pushPlayerActive(currentRoom,player);
              room.in(tableID).emit('joined');
              currentRoom.gameStatus = true;
              activeTable = tableID+"active";
              socket.join(activeTable);
              console.log(table);
              currentRoom.potValue = currentRoom.bootamount * currentRoom.activePlayers.length;
              gameBegin(currentRoom, activeTable);
          } 
          else if((currentRoom.activePlayers.length >= 2 || currentRoom.players.length >= 2) && !currentRoom.gameStatus ) {
              console.log('else if')
              pushPlayerActive(currentRoom, currUsername);
              room.in(tableID).emit('joined');
              activeTable = tableID+"active";
              socket.join(activeTable);
              currentRoom.potValue = currentRoom.bootamount * currentRoom.activePlayers.length;
              currentRoom.gameStatus = true;
              gameBegin(currentRoom, activeTable);
          }
          else if((currentRoom.activePlayers.length >= 2) && currentRoom.gameStatus ) {
              room.in(currUsername).emit('wait');
          }   
  });
  function gameBegin(currentRoom, activeTableID) {
      // console.log(table.potValue)
      // table.potValue = 0;
      // currentRoom.activePlayers.length = currentRoom.players.length;
      // console.log("active player " + currentRoom.activePlayers.length);
      allRandCards = {}
      for(let i=0;i<currentRoom.players.length; i++){
          // console.log(currentRoom.players[i].userType)
          var cards;
          [cards, allRandCards] = deck.getRandomCards(3, currentRoom.players[i].userType, allRandCards);
          let flag = 0;
          for(let j = 0; j<currentRoom.activePlayers.length; j++) {
              if(currentRoom.players[i].username.name === currentRoom.activePlayers[j]) {
                  flag = 1; 
                  // console.log("second loop");
                  break;
              }
          }
          if(!flag)
              // console.log("game begin");
              currentRoom.addActivePlayer(currentRoom.players[i].username.name);
              currentRoom.playerChance = 0;
              currentRoom.players[i].lastMove = null;
              currentRoom.players[i].totalExpend = -currentRoom.bootamount;
              // console.log(currentRoom.players[i].username.name + " " + currentRoom.players[i].currentPocket)
              // console.log(currentRoom.players[i].username.name + " " + currentRoom.players[i].totalExpend)
              // currentRoom.players[i].currentPocket = currentRoom.players[i].currentPocket-currentRoom.players[i].totalExpend;
              updateUserCredit(currentRoom.players[i].username.name,currentRoom.players[i].totalExpend);
              // console.log("bootamount");
              currentRoom.players[i].cards = cards;
              currentRoom.players[i].blindLimit = 4;
              currentRoom.players[i].cardStatus = false;
              // console.log("card status " + currentRoom.players[i].cardStatus + " blindLimit " + currentRoom.players[i].blindLimit)
      }
      table.playerChance = 0;
      table.bootamount = saveBootAmount;
      room.in(currentRoom.tableId).emit('reset',currentRoom.potValue);
      console.log(currentRoom.potValue);
      if(currentRoom.activePlayers.length === 1) {
          room.in(currentRoom.activePlayers[0]).emit('waitforothers');
      }
      else {
          room.in(currentRoom.tableId).emit('gamebegins','The game begins!');
          table.potValue = table.bootamount * currentRoom.players.length;
          getNextActivePlayer(currentRoom);
      }
  }

  function getNextActivePlayer(tableID) {
      table = fetchRoom(tableID);
      if(currentRoom.activePlayers.length === 1){
          console.log("getting in if");
          gameOver(tableID); 
      } else {
          if(table.activePlayers.length === 2)
              room.in(tableID).emit('active show');
          if(table.playerChance === table.activePlayers.length) {
              table.playerChance = 0;
          }    
          var thePlayerIndex = table.activePlayers[table.playerChance];
          console.log(thePlayerIndex, table.activePlayers, table.playerChance)
          var thePlayer = getPlayer(table,thePlayerIndex);
          room.in(table.tableId).emit('activeChaal',thePlayer.username.name,table.chalValue);
          if(thePlayer.username.name === 'sadik'){
              // responseString =  thePlayer.username.name
              // room.in(table.tableId).emit('timeout', responseString)
            if(thePlayer.blindLimit!==1)
             { 
                 setTimeout(() =>
                  {
                   room.in(table.tableId).emit('computer blind');
                  },3000)
              }
              else
              {
                  setTimeout(() =>
                  {
                   room.in(table.tableId).emit('computer chaal');
                  },3000)
              }
          }
          nomove = setTimeout(()=> {
              var i = table.activePlayers.indexOf(thePlayer.username.name);
              table.activePlayers.splice(i,1);
              responseString =  thePlayer.username.name +" timed out."
              room.in(table.tableId).emit('timeout', responseString)
              setTimeout(() => {
                  console.log(table.tableId)
                  getNextActivePlayer(table.tableId);
              },3000)
          },25000)
          table.playerChance++;
      }
  }
  function compared(tableID) {
      var table = fetchRoom(tableID);
      allActivePlayers = [];
      cardSet = [];
      for(var player in table.activePlayers) {
          temp =  getPlayer(table,table.activePlayers[player])
          console.log(player,"\t",temp)
          allActivePlayers.push(temp);
      }
      for( let i=0;i<allActivePlayers.length; i++) {
          cardSet.push({
              id:allActivePlayers[i].username.name,
              set: allActivePlayers[i].cards
          });
      }
      result =  cardComparer.getGreatest(cardSet);
      console.log(result)
      return result;
  }
  function gameOver(tableID) {
      var table = fetchRoom(tableID);
      if(table.activePlayers.length >= 2) {
          console.log("ifffffffffff")
          winner = compared(tableID);
          theWinner = getPlayer(table,winner.id);
      }
      else
          theWinner =  getPlayer(table,table.activePlayers[0]);
          for(let i=0;i<currentRoom.players.length; i++) {
              room.in(table.tableId).emit('display cards game over', table.players[i].cards,table.players[i].username.name);
          }
          console.log(theWinner.username.name)
          room.in(table.tableId).emit('declareWinner', theWinner.username.name);
          room.in(table.tableId).emit('removeActiveChaal',theWinner.username.name);
          room.in(table.tableId).emit('new game', theWinner.username.name);
          // room.in(table.tableId).emit('reset', table.potValue);
          table.gameStatus = false; 
          // console.log("winner user total expend  " + theWinner.potValue); 
          //theWinner.totalExpend = parseInt(theWinner.totalExpend) + parseInt(table.potValue);
          console.log("total win " + table.potValue);
          theWinner.totalExpend = parseInt(table.potValue) - (0.15*parseInt(table.potValue))
          theAdminRevenue =  (0.15*parseInt(table.potValue));
          theWinner.totalExpend = parseInt(theWinner.totalExpend);
          console.log("after admin commission  " + theWinner.totalExpend)
          theAdminRevenue  = parseInt(theAdminRevenue);
          console.log("admin's revenue  " + theAdminRevenue)
          updateAdminRevenue(theAdminRevenue);
          updateUserCredit(theWinner.username.name,theWinner.totalExpend);
          // table.potValue = table.bootamount * table.players.length;

          setTimeout(()=>{
              gameBegin(table,tableID);
          },13200);
  }
  socket.on('blind',function(data,tableID,player) {
      clearTimeout(nomove);
      // console.log("player name " + player);
      // console.log("data" + data);
      // console.log("table" + tableID);
      // console.log("player" + player);
      var table = fetchRoom(tableID);
      var thePlayer = getPlayer(table,player);
      table.potValue = parseInt(table.potValue) + parseInt(data);
      // console.log(table);
      // console.log(thePlayer);
      // console.log(table.potValue);
      if(parseInt(thePlayer.currentPocket) < parseInt(data)) 
          room.in(player).emit('low balance');
      else {
          // console.log(thePlayer.totalExpend);
          // thePlayer.totalExpend = table.bootamount;
          thePlayer.totalExpend =  - parseInt(data);
          // console.log(thePlayer.totalExpend);
          // console.log(thePlayer.currentPocket);
          thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
          // console.log(thePlayer.currentPocket);
          updateUserCredit(player,thePlayer.totalExpend);
          if(table.potValue >= parseInt(table.potLimit)) {
              console.log("in this if hahahaahahhaha")
              gameOver(tableID);
          } else {
              if(thePlayer.blindLimit!==1) {
                  table.chalValue = parseInt(data);
                  thePlayer.blindLimit--;
                  room.in(table.tableId).emit('updatePotvalue',table.potValue);
                  room.in(table.tableId).emit('updateChaalValue',table.chalValue);
                  room.in(table.tableId).emit('removeActiveChaal',player);
                  room.in(table.tableId).emit('updatebalance',player,thePlayer.currentPocket);
                  room.in(table.tableId).emit('restore inc');
              }
              else {
                  var table = fetchRoom(tableID);
                  var thePlayer = getPlayer(table,player);
                  thePlayer.cardStatus =  true;
                  console.log(data,thePlayer, thePlayer.cards)
                  room.in(player).emit('disable blind')
                  room.in(player).emit('display cards', thePlayer.cards);
                  room.in(tableID).emit('update status',thePlayer.username.name)
              } 
                  
              getNextActivePlayer(tableID);
          }
      }
      
  })
  socket.on('chaal',function(data,tableID,player) {
      clearTimeout(nomove);
      // console.log("chaal");
      // console.log("data" + data);
      // console.log("table" + tableID);
      // console.log("player" + player);
      var table = fetchRoom(tableID);
      var thePlayer = getPlayer(table,player);
      table.potValue = parseInt(table.potValue) + parseInt(data);
      if(parseInt(thePlayer.currentPocket) < parseInt(data)) 
          room.in(player).emit('low balance');
      else {
          thePlayer.totalExpend = parseInt(thePlayer.totalExpend) - parseInt(data);
          thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
          updateUserCredit(player,thePlayer.totalExpend);
          if(table.potValue >= parseInt(table.potLimit)) {
              gameOver(tableID);
          } else {
              table.chalValue = parseInt(data);
              room.in(table.tableId).emit('updatePotvalue',table.potValue);
              room.in(table.tableId).emit('updateChaalValue',table.chalValue);
              room.in(table.tableId).emit('updatebalance',player,thePlayer.currentPocket);
              room.in(table.tableId).emit('removeActiveChaal',player);
              room.in(table.tableId).emit('restore inc');
              getNextActivePlayer(tableID);
          }
      }
  })
  socket.on('pack', function(tableID,player) {
      clearTimeout(nomove);
      var table = fetchRoom(tableID);
      var thePlayer = getPlayer(table,player);
      for( var i = 0; i <table.activePlayers.length; i++){ 
          if ( table.activePlayers[i] === player) {
              table.activePlayers.splice(i, 1); 
          }
      }
      room.in(table.tableId).emit('removeActiveChaal',player);
      getNextActivePlayer(tableID);
  })
  socket.on('cards open', (tableID,data) => {
      var table = fetchRoom(tableID);
      var thePlayer = getPlayer(table,data);
      thePlayer.cardStatus =  true;
      console.log(data,thePlayer, thePlayer.cards)
      room.in(data).emit('disable blind')
      room.in(data).emit('display cards', thePlayer.cards);
      room.in(tableID).emit('update status',thePlayer.username.name)
  })
  socket.on('show time', function(data, tableID, player) {
      clearTimeout(nomove);
      var table = fetchRoom(tableID);
      var thePlayer = getPlayer(table,player);
      console.log("active players length = " + table.activePlayers.length);
      table.potValue = parseInt(table.potValue) + parseInt(data);
      if(parseInt(thePlayer.currentPocket) < parseInt(data)) 
          room.in(player).emit('low balance');
      else {
          thePlayer.totalExpend = parseInt(thePlayer.totalExpend) - parseInt(data);
          thePlayer.currentPocket = parseInt(thePlayer.currentPocket) - parseInt(data);
          updateUserCredit(player,thePlayer.totalExpend);
          if(table.potValue >= parseInt(table.potLimit)) {
              gameOver(tableID);
          } else {
              table.chalValue = parseInt(data);
              room.in(table.tableId).emit('updatePotvalue',table.potValue);
              room.in(table.tableId).emit('updateChaalValue',table.chalValue);
              room.in(table.tableId).emit('updatebalance',player,thePlayer.currentPocket);
              room.in(table.tableId).emit('removeActiveChaal',player);
              room.in(table.tableId).emit('restore inc');
              // getNextActivePlayer(tableID);
          }
      }
      for(let i=0;i<table.activePlayers.length; i++)
          if(table.activePlayers[i]!== player) {
              nextplayer = table.activePlayers[i];
              nextpos = i;
              break;
          }
      var pos = nextpos ? 0: 1;
      var pos1 = nextpos ? 1: 0;
      var theOtherPlayer = getPlayer(table,nextplayer);
      cardsToCompare = [
          {
              id:pos1,
              set: thePlayer.cards
          },
          {
              id:pos,
              set: theOtherPlayer.cards
          }
      ]
      result = cardComparer.getGreatest(cardsToCompare);
      console.log("result "+ result.id);
      console.log(table.activePlayers);
      table.activePlayers.splice(result.id,1);
      room.in(table.tableId).emit('removeActiveChaal',player);
      getNextActivePlayer(tableID);
  })
  socket.on('sideshow', function(tableID, player) {
      clearTimeout(nomove);
      var table = fetchRoom(tableID);
      console.log(table)
      var thePlayer = getPlayer(table,player);
      var i = table.activePlayers.indexOf(player);
      if(i == 0)
          pos = table.activePlayers.length-1;
      else
          pos = i - 1;
      var prevPlayer = getPlayer(table,table.activePlayers[pos]);
      console.log(thePlayer,prevPlayer)
      if(thePlayer.cardStatus === true && prevPlayer.cardStatus === true) {
          room.in(prevPlayer.username.name).emit('sideshow request', thePlayer.username.name)
      }
      else {
          room.in(tableID).emit('sideshow error')
      }
  })
  socket.on('accept', function (tableID, player) {
      clearTimeout(nomove);
      var table = fetchRoom(tableID);
      var thePlayer = getPlayer(table,player);
      var i = table.activePlayers.indexOf(player);
      if(i == 0)
          pos = table.activePlayers.length-1;
      else
          pos = i - 1;
      var prevPlayer = getPlayer(table,table.activePlayers[pos]);
      console.log(thePlayer,prevPlayer)
      var cardsToCompare = [
          {
              id:thePlayer.username.name,
              set: thePlayer.cards
          },
          {
              id:prevPlayer.username.name,
              set: prevPlayer.cards
          }
      ] 
      result = cardComparer.getGreatest(cardsToCompare);
      for( var i = 0; i <table.activePlayers.length; i++){ 
          if ( table.activePlayers[i] === result.id) {
              table.activePlayers.splice(i, 1); 
          }
      }
      room.in(tableID).emit('sideshow winner',result.id)
      getNextActivePlayer(tableID);
  })
  socket.on('reject',(tableID,player)=>{
      clearTimeout(nomove);
      var table = fetchRoom(tableID);
      var thePlayer = getPlayer(table,player);
      var i = table.activePlayers.indexOf(player);
      if(i == table.activePlayers.length - 1)
          pos = 0;
      else
          pos = i + 1;
      var prevPlayer = getPlayer(table,table.activePlayers[pos]);
      room.in(prevPlayer.username.name).emit('sideshow reject',thePlayer.username.name);
      getNextActivePlayer(tableID);
  })
  socket.on('send tip', function(tip, player) {
      User.find({username: player}, function(err, data) {
          if(err)
              console.log(err)
          else {
              if(data[0].credits < tip)
                  room.in(player).emit('tip error');
              else  {
                  updateUserCredit(player, -tip);
                  room.in(player).emit('tip added');
              }
                  
          }
      })
  })
  socket.on('leave', function(tableID, player) {
      clearTimeout(nomove);
      console.log(tableID,player)
      var table = fetchRoom(tableID);
      console.log(table)
      for( var i = 0; i <table.players.length; i++){ 
          if ( table.players[i].username.name === player) {
            table.players.splice(i, 1); 
          }
      }
      for( var i = 0; i <table.activePlayers.length; i++){ 
          if ( table.activePlayers[i] === player) {
            table.activePlayers.splice(i, 1); 
          }
      }
      room.in(player).emit('redirect', '/game')
      socket.leave(tableID);
      socket.leave(player);
      if(table.activePlayers.length !== 0)
          getNextActivePlayer(tableID)
      
  })
  socket.on('disconnect', () => {
      tableID = socket.room;
      player =  socket.username;
      socket.leave(tableID);
      socket.leave(player);
  })

});