const { webscraper } = require("./webscraper");
const { chess } = require("./chess");

const gameDifficulty = "intermediate"; //"beginner", "intermediate", "expert"

async function main(){
	await webscraper.init();

	await webscraper.startGame(gameDifficulty);

	let result = await game();

    chess.opChosenActionIndex = 1000;

	console.log("***result***: " + result);
	console.log("***myColor***: " + chess.myColor);

	//await webscraper.end();
}

async function programWaitFor(x){
    await new Promise((resolve, reject) =>{
        setTimeout(() => {
            resolve();
        }, x)
    }) 
}

async function game(){

    let isThinkingOfMove = false;
    let isGameOver = undefined;
    let progress = 1;
    let isMyFirstTurn = true;

    chess.myColor = await webscraper.getMyColor();

	while(isGameOver == undefined){

        let isMyTurn = await webscraper.whosTurn();

        if(isMyTurn && !isThinkingOfMove){

            console.log("My turn! thinking...");
            let grid = await webscraper.createGrid();

            if(isMyFirstTurn){

                let isNobodyHasDoneMove = true;

                for(let i = 2; i < 6; i++){
                    for(let j = 0; j < 8; j++){
                        if(grid[i][j] != 0){
                            isNobodyHasDoneMove = false;
                            break;
                        }
                    }

                    if(!isNobodyHasDoneMove) break;
                }

                console.log("curr color: " + chess.myColor);

                let hasChangedColor = false;

                if(!isNobodyHasDoneMove){
                    //I am black
                    if(chess.myColor != "b") hasChangedColor = true;
                    chess.myColor = "b";
                    webscraper.myColor = "b";
                }
                else{
                    //I am white
                    if(chess.myColor != "w") hasChangedColor = true;
                    chess.myColor = "w";
                    webscraper.myColor = "w";
                }


                console.log("after color: " + chess.myColor);

                if(hasChangedColor) grid = await webscraper.createGrid();
                
                isMyFirstTurn = false;
            }

            chess.grid = grid;

            if(chess.opChosenActionIndex == -1){
                chess.setOpChosenActionIndex();

                if(chess.opChosenActionIndex == -1){
                    //I didn't found out what the op has done
                    chess.shouldSimulate = true;
                }
            }

            console.log("chess.opChosenActionIndex: " + chess.opChosenActionIndex);
            console.log("chess.shouldSimulate: " + chess.shouldSimulate);

            if(chess.shouldSimulate == true){
                chess.opChosenActionIndex = -1;
                isThinkingOfMove = true;
                let action = await chess.getAction();
                console.log("action.bestAction: ");
                console.log(action.bestAction);
                console.log("action.bestScore: ");
                console.log(action.bestScore);
                console.log();

                if(action.bestScore == -1000){
                    //I will lose the game
                    //so Resign from the game
                    await webscraper.resign();
                    return "I have resign";
                }
    
                await webscraper.doAction(action.bestAction);

                //update the grid according to my action
                let type = chess.grid[action.bestAction.startingPos.i][action.bestAction.startingPos.j];

                chess.grid[action.bestAction.startingPos.i][action.bestAction.startingPos.j] = 0;
                if(type == 1 && action.bestAction.endingPos.i == 0){
                    chess.grid[action.bestAction.endingPos.i][action.bestAction.endingPos.j] = 5;
                }
                else chess.grid[action.bestAction.endingPos.i][action.bestAction.endingPos.j] = type;
            }
            else if(chess.shouldSimulate == "simulating"){
                await programWaitFor(250);
            }
            else{
                chess.opChosenActionIndex = -1;
                let action = chess.shouldSimulate;
                isThinkingOfMove = true;

                console.log("my action: ");
                console.log(action);

                if(action.bestScore == -1000){
                    //I will lose the game
                    //so Resign from the game
                    await webscraper.resign();
                    return "I have resign";
                }
    
                await webscraper.doAction(action.bestAction);
                //update the grid according to my action
                let type = chess.grid[action.bestAction.startingPos.i][action.bestAction.startingPos.j];

                chess.grid[action.bestAction.startingPos.i][action.bestAction.startingPos.j] = 0;
                if(type == 1 && action.bestAction.endingPos.i == 0){
                    chess.grid[action.bestAction.endingPos.i][action.bestAction.endingPos.j] = 5;
                }
                else chess.grid[action.bestAction.endingPos.i][action.bestAction.endingPos.j] = type;
            }
        }
        else{
            if(!isMyFirstTurn && chess.shouldSimulate != "simulating"){
                chess.opTurn();
            }

            let strToShowProgress = "Opponent turn";
            for(let i = 0; i < progress; i++){
                strToShowProgress += ".";
            }
            console.log(strToShowProgress);
            await programWaitFor(250);
            isThinkingOfMove = false;
            progress++;
            if(progress == 4) progress = 1;
        }

        isGameOver = await webscraper.isGameOver();
    }

    return isGameOver;
}

main();


