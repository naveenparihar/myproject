var mongoose = require('mongoose'),
    rooms = require('./models/rooms');

var data = [
        {
            roomName: 1,
            bootAmount: 10,
            chaalLimit: 80,
            potLimit: 640,
            blindLimit: 4,
            minBuyIn: 256
        },
        {
            roomName: 2,
            bootAmount: 50,
            chaalLimit: 1600,
            potLimit: 8000,
            blindLimit: 4,
            minBuyIn: 1200
        },
        {
            roomName: 3,
            bootAmount: 100,
            // chaalLimit: ,
            // potLimit: 4800,
            // blindLimit: 4,
            minBuyIn: 2400
        },
        {
            roomName: 4,
            bootAmount: 200,
            // chaalLimit: 1280,
            // potLimit: 6400,
            // blindLimit: 4,
            minBuyIn: 4800
        },
        {
            roomName: 5,
            bootAmount: 500,
            // chaalLimit: 1600,
            // potLimit: 8000,
            // blindLimit: 4,
            minBuyIn: 12000
        }
];

function seedDb() {
    rooms.find({},function(err,returnedData) {
        if(err)
            console.log(err);
        else {
            if(returnedData.length === 0) {
                data.forEach(function(seed) {
                    rooms.create(seed, function(err,data){
                        if(err)
                            console.log(err);
                        else
                            console.log("Room created!");
                    })
                });
            } else {
                console.log("Database already populated!");
            }
        }
    })
    
}

module.exports = seedDb;