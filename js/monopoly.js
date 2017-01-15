//Monopoly namespace object is defined
var Monopoly = {};
//Globals are defined
Monopoly.allowRoll = true;
Monopoly.moneyAtStart =500; //Updated to a more reasonable amount of money
Monopoly.doubleCounter = 0;
Monopoly.deletedPlayers = [];
Monopoly.broke = false;




//Initialization function loads html and css, loads first popup
Monopoly.init = function(){

    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();

    });
};

//Called from the init function in the beginning of a new game, shows intro pop up
Monopoly.start = function(){
    Monopoly.showPopup("intro")
};

//Called from the init function, if allowRoll (initially true) is true, makes call to the rollDice() function
Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};

Monopoly.createPlayersScores= function(){
    $(".player").each(function(){
        $("<span>").text($(this).attr("title")).addClass("playerScore "+$(this).attr("id")).appendTo("#score");
    })
}

Monopoly.updatePlayerScore = function(){
    var player  =  Monopoly.getCurrentPlayer();
    $(".playerScore."+player.attr("id")).text(player.attr("title"));

};

//Returns a jquery object corresponding to the current player
Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};

//Returns the closest .cell div to the player, called by handleTurn and movePlayer
Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};

//returns the value of attribute "data-money" on input player
Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};

//called by handlePayRent and handleBuyProperty
Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money")); //Returns the current money of the player as an int
    playersMoney += amount; //Modified this line to add money to player instead of subtract

    player.attr("data-money", playersMoney);//Sets new value to "data-money" attribute

    //Handle Broke player logic
    if (playersMoney < 0 ){
        var popup = Monopoly.getPopup("broke");
        popup.find(".popup-title").text("YOU BROKE SON");
        popup.find("button").unbind("click").bind("click",function() {
            if($(".player").length- Monopoly.deletedPlayers.length <=1){
                var winPopup =$("#winner")
                winPopup.find(".popup-title").text("WINNER");
                winPopup.find("#text-placeholder").text(Monopoly.getCurrentPlayer().attr("id")+ " you are the winner!!!");
                winPopup.find("button").unbind("click").bind("click",function(){
                    Monopoly.removePlayer();
                    $(".player").remove();
                    $("#score").html("");
                    Monopoly.init();
                });
                Monopoly.showPopup("winner");
                return;
            }
            //else insert logic to setNextPlayerTurn upon the bu
        });

        Monopoly.removePlayer();
        Monopoly.showPopup("broke");
        Monopoly.broke = true;
    }
    else {
        //Update the title attribute, currently unused (initialized in createPlayer method)
        player.attr("title", player.attr("id") + ": $" + playersMoney);
        Monopoly.updatePlayerScore();
        Monopoly.playSound("chaching");
    }
};

//Function to roll dice and update the dice classes to fill in dice dot divs. Triggered by a click on the $(.dice) divs
Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ;
    var result2 = Math.floor(Math.random() * 6) + 1 ;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("background-color","#364c9c").css("opacity","1");
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("background-color","#364c9c").css("opacity","1");
    if (result1 == result2){
        Monopoly.doubleCounter++;
    }
    else{
        Monopoly.doubleCounter = 0;
    }
    //Retrieves current player
    var currentPlayer = Monopoly.getCurrentPlayer();
    //handleAction function is called here to move the player a certain number of steps
    Monopoly.handleAction(currentPlayer,"move",result1 + result2);
};

//Function called by the handleAction function or the rollDice function. Either you are moved by a popup card, or you are moved
//by a normal roll of the dice
Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
    //Sets an interval which takes player from current position to new position moving him one cell per interval
    //Clears interval once steps ==0
    var playerMovementInterval = setInterval(function(){
        if (steps == 0){
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
            var cell = Monopoly.getPlayersCell(player);
            if(cell.attr("data-owner")== player.attr("id")){
                player.addClass("smiley");
            }
        }else{
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            if(nextCell.attr("data-owner")!=player.attr("id")){
                player.removeClass("smiley");
                player.addClass("current-turn");
            }

            nextCell.find(".content").append(player);
            steps--;
        }
    },200);
};


//Called by the move player function, during a "dice move". This function checks the players current cell
//and then
Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    //grabs current cell of the player
    var playerCell = Monopoly.getPlayersCell(player);
    //checks if the cell has classes .available and .property
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
    //checks if someone owns the property
    }else if(playerCell.is(".property:not(.available)") && !playerCell.hasClass(player.attr("id"))){
         Monopoly.handlePayRent(player,playerCell);
    //checks if the cell is the has the .go-to-jail class
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    //checks if it is a chance card
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    //checks if it is a community card
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }else{
    //unused cell, sets the next players turn;
        Monopoly.setNextPlayerTurn();
    }
}

//called by the setNextPlayerTurn function to ensure that removed players are not selected
//by checking if the playerId selected is not in Monopoly.deletedPlayers
Monopoly.getNextValidPlayerId = function(){
    var nextPlayerId = 0;
    var playerId = parseInt(Monopoly.getCurrentPlayer().attr("id").replace("player", ""));
    if(Monopoly.deletedPlayers.length != $(".player").length) {
        while ((nextPlayerId == 0 || Monopoly.deletedPlayers.indexOf(nextPlayerId) != -1)) {
            nextPlayerId = playerId + 1;
            playerId += 1;
            if (nextPlayerId > $(".player").length) {
                nextPlayerId = 1;
                playerId = 0;
            }
        }
    }

    return nextPlayerId;

};

//called buy various functions within the handleTurn function
Monopoly.setNextPlayerTurn = function(){
    if(Monopoly.doubleCounter==3){
        Monopoly.doubleCounter = 0;
        Monopoly.sendToJail(Monopoly.getCurrentPlayer());
    }
    if(!(Monopoly.doubleCounter>=1 && !Monopoly.getCurrentPlayer().is(".jailed"))) {
        Monopoly.doubleCounter = 0;
        var currentPlayerTurn = Monopoly.getCurrentPlayer();
        var nextPlayerId = Monopoly.getNextValidPlayerId();
        if (nextPlayerId > $(".player").length) {
            nextPlayerId = 1;
        }

        currentPlayerTurn.removeClass("current-turn");
        var nextPlayer = $(".player#player" + nextPlayerId);
        nextPlayer.addClass("current-turn");

        if (nextPlayer.is(".jailed")) {
            var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
            currentJailTime++;
            nextPlayer.attr("data-jail-time", currentJailTime);
            if (currentJailTime > 3) {
                nextPlayer.removeClass("jailed");
                nextPlayer.removeAttr("data-jail-time");
            }
            Monopoly.setNextPlayerTurn();
            return;
        }


    }


    if(! Monopoly.broke) {
        Monopoly.closePopup();
    }
    Monopoly.allowRoll = true;
};

//called from the handleTurn function, this function loads the buy pop up, modifies the pop ups text and button content
//sets a click event on both button elements. When clicked it checks the id of the clicked button, if its yes
//the function calls handleBuy, if its no the function calls closeAndNextTurn
Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

//called by the handleTurn function (which is called by movePlayer) this function updates players money when the
//user clicks the OK button and then calls closeAndNextTurn to set next player and close the popup
Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);
        if(!Monopoly.broke) {
            Monopoly.closeAndNextTurn();
        }else{
            Monopoly.setNextPlayerTurn();
            Monopoly.broke = false;
        }
    });
   Monopoly.showPopup("pay");
};


Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};

//This function uses the AJAX get command to retrieve chance data from the server url, this data is then used to update the
//chance popup card html. the function finishes with a call to handle acction based on the content returned from the get command
Monopoly.handleChanceCard = function(player){
    Monopoly.showPopup("chance");
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(commJson){
        popup.find(".popup-content #text-placeholder").text(commJson["content"]);
        popup.find(".popup-title").text(commJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",commJson["action"]).attr("data-amount",commJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = parseInt(currentBtn.attr("data-amount"));
        if(action == "pay"){
            amount=amount*(-1);
        }
        //calls handle action which in turn calls movePlayer sendToJail or updatePlayerMoney
        Monopoly.handleAction(player,action,amount);
    });

};

//This function uses the AJAX get command to retrieve community card data from the server url, this data is then used to update the
//chance popup card html. the function finishes with a call to handle acction based on the content returned from the get command
Monopoly.handleCommunityCard = function(player){
    Monopoly.showPopup("community");
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(commJson){
        popup.find(".popup-content #text-placeholder").text(commJson["content"]);
        popup.find(".popup-title").text(commJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",commJson["action"]).attr("data-amount",commJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = parseInt(currentBtn.attr("data-amount"));
        if(action == "pay"){
            amount=amount*(-1);
        }
        //calls handle action which in turn calls movePlayer sendToJail or updatePlayerMoney
        Monopoly.handleAction(player,action,amount);
    });


};

//function called in handleAction and setNextPlayerTurn (in the event of 3 consecutive doubles)
Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//retrieves a pop up html div based on id
Monopoly.getPopup = function(popupId){
    return $(".popup-lightbox .popup-page#" + popupId);
};

//calculates the cost of a property based on the cellGroup attribute of the current propertyCell div

Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};


Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};

//called by handleBuy when a player does not buy a property (closes a popup and sets next player)
Monopoly.closeAndNextTurn = function(){
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//initializes the initial popup asking for number of players, called by the .init function
Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").unbind("click").bind("click",function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

//called by the handleBuyProperty function, checks that player has enough money, if so calls updatePlayersMoney
//If not, calls the showErrorMsg function
Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.playSound("woopwoop");
        Monopoly.showErrorMsg();
    }else{
        Monopoly.updatePlayersMoney(player,-1*propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);
        Monopoly.setNextPlayerTurn();
        player.addClass("smiley");
    }
};




//called by handleChanceCard and handleCommunityCard functions
Monopoly.handleAction = function(player,action,amount){

    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
             break;
        case "pay":
            Monopoly.updatePlayersMoney(player,amount);

            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    //if player is broke as a result of a chance/community card, do not close the popup (since a new pop up for broke is displayed after
    //the initial chance/community card popup). If you close the broke pop up here it will disappear right away since the popup is
    //triggered within this function (and its button click is not tied to this function as is the normal process with handleAction function calls
    if(!Monopoly.broke) {
        Monopoly.closePopup();
    }
    else{
        Monopoly.broke = false;
    }
};




//creates players based on numOfPlayers input retrieved from the initPopup
Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
    Monopoly.createPlayersScores();
};

//removes the current player and all of cell property attributes associated to that player
//called when a user is determined broke in the updatePlayersMoney function
Monopoly.removePlayer = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerId = player.attr("id");
    var playerCells = $(".cell."+playerId);
    playerCells.removeAttr("data-owner");
    playerCells.addClass("available");
    playerCells.removeClass(playerId);
    Monopoly.deletedPlayers.push((parseInt(playerId.replace("player",""))));
    player.hide();
};

//returns the next cell, checks if go was passed called in the movePlayer function
Monopoly.getNextCell = function(cell){
    var currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1;
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

//called in getNextCell, if go is passed money is updated
Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player,Monopoly.moneyAtStart/10);
};

//validates number of players
Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 1 && value <= 6){
                isValid = true;
            }
            break;
    }

    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;

}

//displays an error message (shows the error message written to in buy Property when a player has insufficient funds)
Monopoly.showErrorMsg = function(){
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};

//sets board size dynamically with a media query
Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}
//closes the current popup
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};

Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav"); 
    snd.play();
}

Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.init();