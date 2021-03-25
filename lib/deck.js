var Card = require('./card');

function Deck() {
   
    var deck = [],
        types = {
            'heart': {
                priority: 3
            },
            'spade': {
                priority: 4
            },
            'diamond': {
                priority: 2
            },
            'club': {
                priority: 1
            }
        };

    function makeCards() {
        for (var type in types) {
            for (var a = 1; a <= 13; a++) {
                deck.push(new Card(type, a));
            }
        }
    }
    makeCards();

    function getCards() {
        return deck;
    }
    var extend = function () {

        // Variables
        var extended = {};
        var deep = false;
        var i = 0;
        var length = arguments.length;
        // console.log(arguments)
    
        // Check if a deep merge
        if ( Object.prototype.toString.call( arguments[0] ) === '[object Boolean]' ) {
            deep = arguments[0];
            i++;
        }
    
        // Merge the object into the extended object
        var merge = function (obj) {
            for ( var prop in obj ) {
                if ( Object.prototype.hasOwnProperty.call( obj, prop ) ) {
                    // If deep merge and property is an object, merge properties
                    if ( deep && Object.prototype.toString.call(obj[prop]) === '[object Object]' ) {
                        extended[prop] = extend( true, extended[prop], obj[prop] );
                    } else {
                        extended[prop] = obj[prop];
                    }
                }
            }
        };
    
        // Loop through each object and conduct a merge
        for ( ; i < length; i++ ) {
            var obj = arguments[i];
            merge(obj);
        }
    
        return extended;
    
    };
    function getRandomArbitrary(min, max) {
        return parseInt(Math.random() * (max - min) + min, 0);;
    }

    function shuffle() {
        var len = deck.length,
            tempVal, randIdx;
        while (0 !== len) {
            randIdx = Math.floor(Math.random() * len);
            len--;
            deck[len].id = Math.random();
            deck[randIdx].id = Math.random();
            tempVal = deck[len];
            deck[len] = deck[randIdx];
            deck[randIdx] = tempVal;
        }
    }

    function getRandomCards(num, userType, allRandCards) {
        var randCards = [];
        var cardInserted = {},
            nCard = null;
            for(let i = 1;i<=52; i++){
                // console.log("cards " + allRandCards[i])
            }
        if(userType === 'admin'){
            nCard = getRandomArbitrary(1, 50);
            // console.log(nCard);
            for (var count = 1; count <= num;) {
                // console.log("if " + nCard)
                // console.log("deck " + allRandCards[nCard])
                    if (!cardInserted[nCard] && !allRandCards[nCard]) {
                        randCards.push(extend({
                            id: Math.random()
                        }, deck[nCard - 1]));
                        cardInserted[nCard] = true;
                        count++;
                        nCard++;
                    }else{
                        nCard = getRandomArbitrary(1, 50);
                    }
                }
        }    
        else{
            for (var count = 1; count <= num;) {
            nCard = getRandomArbitrary(1, 52);
            // console.log("if " + nCard)
            // console.log("check all cards " + allRandCards[nCard])
                if (!cardInserted[nCard] && !allRandCards[nCard]) {
                    randCards.push(extend({
                        id: Math.random()
                    }, deck[nCard - 1]));
                    cardInserted[nCard] = true;
                    count++;
                }
            }
        }
        // console.log("randCard ")
        return [randCards, cardInserted];
    }


    return {
        getCards: getCards,
        getRandomCards: getRandomCards,
        shuffle: shuffle
    }
}

module.exports = new Deck();