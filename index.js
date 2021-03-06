"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var path = require("path");
var request = require("request");
var ws_1 = require("ws");
var app = express();
var wsServer = new ws_1.Server({ port: 8085 });
//store the JSON data form the API
var stockJson;
//set the default stock name as GOOGL
var company = "GOOGL";
//Store the latest price from the JSON
var currentPrice;
//Initiate the balance
var balanceInit = 1000000;
//Dynamic balance
var balance = balanceInit;
//To validate whether the URL is valid
var apiStatus = false;
//model of the displayed info of the current stock
var StockShow = /** @class */ (function () {
    function StockShow(name, currentTime, currentPrice) {
        this.name = name;
        this.currentTime = currentTime;
        this.currentPrice = currentPrice;
    }
    return StockShow;
}());
exports.StockShow = StockShow;
//Model of stock exchange data of the user
var StockBuy = /** @class */ (function () {
    function StockBuy(name, amount, currentPrice, currentTime, boughtPrice, boughtAmount, soldPrice, soldAmount) {
        this.name = name;
        this.amount = amount;
        this.currentPrice = currentPrice;
        this.currentTime = currentTime;
        this.boughtPrice = boughtPrice;
        this.boughtAmount = boughtAmount;
        this.soldPrice = soldPrice;
        this.soldAmount = soldAmount;
    }
    return StockBuy;
}());
exports.StockBuy = StockBuy;
app.use('/', express.static(path.join(__dirname, 'client')));
//Initiate the stock account arr
var stocksBuy = [
    new StockBuy("GOOGL", 100, 1244.28, "2018-08-28 15:55:00", [1244.28], [100], [], []),
    new StockBuy("MSFT", 150, 110.2, "2018-08-28 15:55:00", [110.2], [150], [], []),
    new StockBuy("AAPL", 150, 219.58, "2018-08-28 15:55:00", [219.58], [150], [], [])
];
// Get JSON data from the API
getJSON(company);
// The method JSON data from the API
function getJSON(companyName) {
    var url = "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=" + companyName + "&interval=5min&apikey=BJTKF7XS9J2WU3UR";
    request(url, function (err, response, body) {
        if (!err && response.statusCode == 200) {
            //Parse the JSON data
            stockJson = JSON.parse(body);
            //Validate the input stock name through API
            //If false, A short JSON will be returned
            if (Object.keys(stockJson).length < 2) {
                apiStatus = false;
                console.log("Error message" + stockJson["Error Message"]["2. Symbol"]);
                return;
            }
            //Validation Passed
            apiStatus = true;
            //get Info from the JSON 
            var tempKey = Object.keys(stockJson)[1];
            var currentTimeObj = stockJson[tempKey];
            var currentTime = Object.keys(currentTimeObj)[0];
            currentPrice = parseFloat(currentTimeObj[currentTime]["1. open"]);
            //Initiate the stockNameArr, to validate if the input stock name is included in the user's account
            var stockNameArr_1 = [];
            stocksBuy.forEach(function (ele) {
                stockNameArr_1.push(ele.name);
            });
            //If included, assign the current price and current time to it, for client display
            if (stockNameArr_1.indexOf(company) >= 0) {
                stocksBuy.filter(function (ele) { return ele.name === company; })[0].currentPrice = currentPrice;
                stocksBuy.filter(function (ele) { return ele.name === company; })[0].currentTime = currentTime;
            }
        }
    });
}
wsServer.on("connection", function (websocket) {
    //Send the fetched JSON data from API to the client
    websocket.send(JSON.stringify(stockJson));
    console.log("connection on");
    //Update the data every 3 minutes
    //Unstable
    // setInterval(() => {
    //   websocket.send(JSON.stringify(stockJson));
    //   console.log("Updating");
    // }, 180000);
    //Handle the received message
    //Two kinds of message: search input and stock account data in a array
    websocket.on("message", function (message) {
        //Get a short string, accept it as the search input
        if (message.length < 10) {
            //get JSON info from the API
            getJSON(message);
            if (apiStatus === true) {
                //Validation Passed
                //Allow to change the company name
                company = message;
                //send the update info to the client
                websocket.send(JSON.stringify(stockJson));
            }
            return;
        }
        //Not a search input here
        //In expectation, an update stock account array will be received
        stocksBuy = JSON.parse(message);
        //Calculate the balance
        balance = balanceCal();
        //Balance calculate method
        function balanceCal() {
            var tempCost = 0;
            var tempGain = 0;
            stocksBuy.forEach(function (element) {
                element.boughtAmount.forEach(function (ele, idx) {
                    tempCost += ele * element.boughtPrice[idx];
                });
                element.soldAmount.forEach(function (ele, idx) {
                    tempGain += ele * element.soldPrice[idx];
                });
            });
            return (balance =
                balanceInit + tempGain - tempCost >= 0
                    ? balanceInit + tempGain - tempCost
                    : balance);
        }
    });
});
app.listen(8000, "localhost", function () {
    console.log("Server is on");
});
//send the stock account array to the client
app.get("/api/stock", function (req, res) {
    res.json(stocksBuy);
});
//send the balance to the client
app.get("/api/balance", function (req, res) {
    res.json(balance);
});
//send the apiStatus to the client
app.get("/api/validate", function (req, res) {
    res.json(apiStatus);
});
