require("dotenv").config();
const length = 8;
var DEPTH = 4;

const DEBUG = process.env.DEBUG === "true";

const chess = {

	myColor: undefined,
	grid: undefined,
    states: undefined,
    moneStatesEnconterd: 0,
    evalDict: {
        "-1": -10,
        "1": 10,
        "-2": -25,
        "2": 25,
        "-3": -30,
        "3": 30,
        "-4": -50,
        "4": 50,
        "-5": -90,
        "5": 90,
        "-6": 0,
        "6": 0
    },
    opActions: [],
    opChosenActionIndex: -1,
    shouldSimulate: true,

    setOpChosenActionIndex(){
        if(DEBUG) console.log("in setOpChosenActionIndex");
        for(let i in this.opActions){
            let action = this.opActions[i];
            //check if the piece has left his position and is now in the new position
            //THERE IS A BUG HERE!!
            if(this.grid[action.startingPos.i][action.startingPos.j] == 0
            && this.grid[action.endingPos.i][action.endingPos.j] != 0){
                this.opChosenActionIndex = i;
                return;
            }
        }

        if(DEBUG) console.log("Op has done unkown action");
    },

    async opTurn(){
        this.shouldSimulate = "simulating";
        DEPTH = 4;
        this.opChosenActionIndex = -1;
        this.states = new Map();

        let allActions = this.getAllActions(false);
        this.opActions = allActions;

        let bestActionForEveryOpAction = [];

        console.log();
        console.log("THINKING ALSO IN THE OPPONENT TURN")
        console.log("numberOfActions to compute = " + allActions.length);

        if(allActions.length == 0){
            //op is in checkmate
            chess.shouldSimulate = true;
            return;
        }

        while(DEPTH <= 20){
            console.log("searching DEPTH: " + DEPTH);
            for(let i in allActions){
                await new Promise((resolve, reject) => {
                    setTimeout(() => { resolve() }, 50); 
                });

                console.log("action number: " + i + " / " + allActions.length);

                //op has took action and it is not leading to this path
                if(this.opChosenActionIndex != -1){
                    //I still has not simulated this action then I need to do it now
                    if(DEBUG) console.log("i: " + i);
                    if(DEBUG) console.log("this.opChosenActionIndex: " + this.opChosenActionIndex);
                    if(this.opChosenActionIndex - i >= 0 && DEPTH == 4){
                        this.shouldSimulate = true;
                        if(DEBUG) console.log("this.opChosenActionIndex >= i");
                        return;
                    }
                    //I have simulated this action already and I have the answer
                    else{
                        if(DEBUG) console.log("i > this.opChosenActionIndex");
                        if(DEBUG) console.log("bestActionForEveryOpAction[this.opChosenActionIndex]: " + bestActionForEveryOpAction[this.opChosenActionIndex])
                        this.shouldSimulate = bestActionForEveryOpAction[this.opChosenActionIndex];
                        return;
                    }
                }

                if(this.shouldSimulate == true){
                    return;
                }

                let action = allActions[i];
                let typeInNextPlace = this.grid[action.endingPos.i][action.endingPos.j];
                let type = this.grid[action.startingPos.i][action.startingPos.j];

                this.grid[action.startingPos.i][action.startingPos.j] = 0;

                let result = 0;

                if(type == -1 && action.endingPos.i == 7){
                    //if this is soldier and he is in the last row in the grid then he will
                    //become a queen
                    this.grid[action.endingPos.i][action.endingPos.j] = -5;
                    result = await this.solve(DEPTH, -Infinity, Infinity, true, this.isMyKingInCheck(action.endingPos.i, action.endingPos.j, -5),
                    -(typeInNextPlace == 0 ? 0 : this.evalDict[typeInNextPlace]) - 80);
                }
                else{
                    this.grid[action.endingPos.i][action.endingPos.j] = type;
                    result = await this.solve(DEPTH, -Infinity, Infinity, true, this.isMyKingInCheck(action.endingPos.i, action.endingPos.j, type),
                    -(typeInNextPlace == 0 ? 0 : this.evalDict[typeInNextPlace]));
                }

                this.grid[action.startingPos.i][action.startingPos.j] = type;
                this.grid[action.endingPos.i][action.endingPos.j] = typeInNextPlace;

                // console.log("result: ");
                // console.log(result);

                if(result != "stop") bestActionForEveryOpAction[i] = result;
                
                if(i == this.opChosenActionIndex){
                    if(DEBUG) console.log("i == this.opChosenActionIndex");
                    this.shouldSimulate = bestActionForEveryOpAction[this.opChosenActionIndex];
                    return;
                }
            }

            DEPTH += 2;
        }

        chess.shouldSimulate = true;
    },

	async getAction(){

        this.states = new Map();
        DEPTH = 4;
        //this.moneStatesEnconterd = 0;

        if(DEBUG) console.log("in getAction");

        let result = await this.solve(DEPTH, -Infinity, Infinity, true, false, 0);

        //console.log("moneStatesEnconterd: " + this.moneStatesEnconterd);

        return result;
	},

	async solve(depth, alpha, beta, maximazingPlayer, inCheck, stateScore){

        //stop the program in certain depth for a while to check if op has done move already
        if(depth == 5){
            await new Promise((resolve, reject) => {
                setTimeout(() => { resolve() }, 20); 
            });
        }

        //op has took action so stop the sim
        if(this.opChosenActionIndex != -1) return "stop";

		if(depth == 0){
			//let score = this.evalGrid();
			return stateScore;
		}

        let scoreOfTheEnconterState = this.hasEnconterStateBefore(this.grid, depth);

        if(scoreOfTheEnconterState != undefined){
            //this.moneStatesEnconterd++;
            return scoreOfTheEnconterState;
        }

		let allActions = this.getAllActions(maximazingPlayer);

		if(maximazingPlayer){
			let bestScore = -1000;
            let bestScoreActions = [];

			if(allActions.length == 0 && inCheck) return -Infinity;

			for(let action of allActions){
				let typeInNextPlace = this.grid[action.endingPos.i][action.endingPos.j];
				let type = this.grid[action.startingPos.i][action.startingPos.j];
	
                this.grid[action.startingPos.i][action.startingPos.j] = 0;

                let score = 0;

                if(type == 1 && action.endingPos.i == 0){
                    //if this is soldier and he is in the last row in the grid then he will
                    //become a queen
                    this.grid[action.endingPos.i][action.endingPos.j] = 5;
                    score = await this.solve(depth - 1, alpha, beta, false, this.isOpKingInCheck(action.endingPos.i, action.endingPos.j, 5),
                    stateScore - (typeInNextPlace == 0 ? 0 : this.evalDict[typeInNextPlace]) + 80);
                }
				else{
                    this.grid[action.endingPos.i][action.endingPos.j] = type;
                    score = await this.solve(depth - 1, alpha, beta, false, this.isOpKingInCheck(action.endingPos.i, action.endingPos.j, type),
                    stateScore - (typeInNextPlace == 0 ? 0 : this.evalDict[typeInNextPlace]));
                }

                if(isNaN(score)) return "stop";

                this.grid[action.startingPos.i][action.startingPos.j] = type;
                this.grid[action.endingPos.i][action.endingPos.j] = typeInNextPlace;

				if(score > bestScore){
					bestScore = score;
                    if(depth == DEPTH){
                        bestScoreActions = [];
                        bestScoreActions.push(action);
                    }

                    alpha = Math.max(alpha, bestScore);

                    if(beta < alpha){
                        break;
                    }
				}
                else if(depth == DEPTH && score == bestScore){
                    bestScoreActions.push(action);
                }
			}

			if(depth != DEPTH){
                this.addStateToStates(this.grid, bestScore, depth);
                return bestScore;
            }

            //choose the best action also based on the piece opening

            let bestOpeningScore = 0;
            let bestAction = undefined;

            // console.log("bestScore: " + bestScore);
            for(let bestScoreAction of bestScoreActions){
                // console.log("bestScoreAction: ");
                // console.log(bestScoreAction);
                // console.log("type: " + this.grid[bestScoreAction.startingPos.i][bestScoreAction.startingPos.j]);
                
                let action = bestScoreAction;

                //sim action
                let typeInNextPlace = this.grid[action.endingPos.i][action.endingPos.j];
				let type = this.grid[action.startingPos.i][action.startingPos.j];
	
                this.grid[action.startingPos.i][action.startingPos.j] = 0;

                if(type == 1 && action.endingPos.i == 0){
                    //if this is soldier and he is in the last row in the grid then he will
                    //become a queen
                    this.grid[action.endingPos.i][action.endingPos.j] = 5;
                }
				else this.grid[action.endingPos.i][action.endingPos.j] = type;
                
                
                let openingScore = 0;


                for(let i = 0; i < length; i++){
                    for(let j = 0; j < length; j++){
                        let cellType = this.grid[i][j];
                        if(cellType > 1 && cellType != 6){
                            openingScore += this.getActionsOfMyPiece(i, j, cellType).length;
                        }
                    }
                }

                this.grid[action.startingPos.i][action.startingPos.j] = type;
                this.grid[action.endingPos.i][action.endingPos.j] = typeInNextPlace;

                if(openingScore > bestOpeningScore){
                    bestOpeningScore = openingScore;
                    bestAction = bestScoreAction;
                    // console.log("bestOpeningScore: " + bestOpeningScore);
                }
            }

			// if(bestScore == Infinity){
			// 	console.log("have Checkmate!!!");
			// }

			return {bestAction, bestScore};
		}
		else{
			let bestScore = 1000;

			if(allActions.length == 0 && inCheck){
				//have Checkmate
				return Infinity;
			}

			for(let action of allActions){
				let typeInNextPlace = this.grid[action.endingPos.i][action.endingPos.j];
				let type = this.grid[action.startingPos.i][action.startingPos.j];
	
                this.grid[action.startingPos.i][action.startingPos.j] = 0;

                let score = 0;

                if(type == -1 && action.endingPos.i == 7){
                    //if this is soldier and he is in the last row in the grid then he will
                    //become a queen
                    this.grid[action.endingPos.i][action.endingPos.j] = -5;
                    score = await this.solve(depth - 1, alpha, beta, true, this.isMyKingInCheck(action.endingPos.i, action.endingPos.j, -5),
                    stateScore - (typeInNextPlace == 0 ? 0 : this.evalDict[typeInNextPlace]) - 80);
                }
				else{
                    this.grid[action.endingPos.i][action.endingPos.j] = type;
                    score = await this.solve(depth - 1, alpha, beta, true, this.isMyKingInCheck(action.endingPos.i, action.endingPos.j, type),
                    stateScore - (typeInNextPlace == 0 ? 0 : this.evalDict[typeInNextPlace]));
                }

                if(isNaN(score)) return "stop";

                this.grid[action.startingPos.i][action.startingPos.j] = type;
                this.grid[action.endingPos.i][action.endingPos.j] = typeInNextPlace;
	
				if(score < bestScore){
					bestScore = score;

                    beta = Math.min(beta, bestScore);

                    if(beta < alpha){
                        break;
                    }
                }
			}

            this.addStateToStates(this.grid, bestScore, depth);

			return bestScore;
		}
	},

	getAllActions(me){
		let allActions = [];

		if(me){
			for(let i = 0; i < length; i++){
				for(let j = 0; j < length; j++){
					if(this.grid[i][j] > 0){
						let actionsOfPiece = this.getActionsOfMyPiece(i, j, this.grid[i][j]);
						allActions.push(...actionsOfPiece);
					}
				}
			}
		}
		else{
			for(let i = 0; i < length; i++){
				for(let j = 0; j < length; j++){
					if(this.grid[i][j] < 0){
						let actionsOfPiece = this.getActionsOfOpPiece(i, j, this.grid[i][j]);
						allActions.push(...actionsOfPiece);
					}
				}
			}
		}

		return allActions;
	},

	getActionsOfMyPiece(i, j, type){
		let actions = [];

		if(type == 1){
			if(i == 6 && this.inRange(i - 2, j) && this.grid[i - 2][j] == 0
            && this.grid[i - 1][j] == 0){
				let move = {startingPos: {i, j}, endingPos: {i: i - 2, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}
			
			if(this.inRange(i - 1, j) && this.grid[i - 1][j] == 0){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i - 1, j - 1) && this.isOpponentPiece(i - 1, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i - 1, j + 1) && this.isOpponentPiece(i - 1, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}
		}
		else if(type == 2){
			if(this.inRange(i - 2, j - 1) && !this.isMyPiece(i - 2, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 2, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i - 2, j + 1) && !this.isMyPiece(i - 2, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 2, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i + 2, j - 1) && !this.isMyPiece(i + 2, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 2, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i + 2, j + 1) && !this.isMyPiece(i + 2, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 2, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i - 1, j - 2) && !this.isMyPiece(i - 1, j - 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j - 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i + 1, j - 2) && !this.isMyPiece(i + 1, j - 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j - 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i - 1, j + 2) && !this.isMyPiece(i - 1, j + 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j + 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i + 1, j + 2) && !this.isMyPiece(i + 1, j + 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j + 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}
		}
		else if(type == 3){
			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1; ii--, jj--){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length; ii++, jj++){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1; ii++, jj--){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length; ii--, jj++){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}
		}
		else if(type == 4){
			for(let ii = i - 1; ii > -1; ii--){
				if(this.inRange(ii, j) && !this.isMyPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, j)) break;
				}
				else break;
			}

			for(let ii = i + 1; ii < length; ii++){
				if(this.inRange(ii, j) && !this.isMyPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, j)) break;
				}
				else break;
			}

			for(let jj = j - 1; jj > -1; jj--){
				if(this.inRange(i, jj) && !this.isMyPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(i, jj)) break;
				}
				else break;
			}

			for(let jj = j + 1; jj < length; jj++){
				if(this.inRange(i, jj) && !this.isMyPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(i, jj)) break;
				}
				else break;
			}
		}
		else if(type == 5){
			for(let ii = i - 1; ii > -1; ii--){
				if(this.inRange(ii, j) && !this.isMyPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, j)) break;
				}
				else break;
			}

			for(let ii = i + 1; ii < length; ii++){
				if(this.inRange(ii, j) && !this.isMyPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, j)) break;
				}
				else break;
			}

			for(let jj = j - 1; jj > -1; jj--){
				if(this.inRange(i, jj) && !this.isMyPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(i, jj)) break;
				}
				else break;
			}

			for(let jj = j + 1; jj < length; jj++){
				if(this.inRange(i, jj) && !this.isMyPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(i, jj)) break;
				}
				else break;
			}

			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1; ii--, jj--){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length; ii++, jj++){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1; ii++, jj--){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length; ii--, jj++){
				if(this.inRange(ii, jj) && !this.isMyPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
					if(this.isOpponentPiece(ii, jj)) break;
				}
				else break;
			}
		}
		else if(type == 6){
			if(this.inRange(i - 1, j) && !this.isMyPiece(i - 1, j)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i + 1, j) && !this.isMyPiece(i + 1, j)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i, j - 1) && !this.isMyPiece(i, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i, j + 1) && !this.isMyPiece(i, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i - 1, j + 1) && !this.isMyPiece(i - 1, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i + 1, j + 1) && !this.isMyPiece(i + 1, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i - 1, j - 1) && !this.isMyPiece(i - 1, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}

			if(this.inRange(i + 1, j - 1) && !this.isMyPiece(i + 1, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, true)) actions.push(move);
			}
		}
		
		return actions;
	},

	getActionsOfOpPiece(i, j, type){
		let actions = [];

		if(type == -1){
			if(i == 1 && this.inRange(i + 2, j) && this.grid[i + 2][j] == 0
            && this.grid[i + 1][j] == 0){
				let move = {startingPos: {i, j}, endingPos: {i: i + 2, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}
			
			if(this.inRange(i + 1, j) && this.grid[i + 1][j] == 0){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 1, j - 1) && this.isMyPiece(i + 1, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 1, j + 1) && this.isMyPiece(i + 1, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}
		}
		else if(type == -2){
			if(this.inRange(i - 2, j - 1) && !this.isOpponentPiece(i - 2, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 2, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i - 2, j + 1) && !this.isOpponentPiece(i - 2, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 2, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 2, j - 1) && !this.isOpponentPiece(i + 2, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 2, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 2, j + 1) && !this.isOpponentPiece(i + 2, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 2, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i - 1, j - 2) && !this.isOpponentPiece(i - 1, j - 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j - 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 1, j - 2) && !this.isOpponentPiece(i + 1, j - 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j - 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i - 1, j + 2) && !this.isOpponentPiece(i - 1, j + 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j + 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 1, j + 2) && !this.isOpponentPiece(i + 1, j + 2)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j + 2}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}
		}
		else if(type == -3){
			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1; ii--, jj--){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length; ii++, jj++){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1; ii++, jj--){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length; ii--, jj++){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}
		}
		else if(type == -4){
			for(let ii = i - 1; ii > -1; ii--){
				if(this.inRange(ii, j) && !this.isOpponentPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, j)) break;
				}
				else break;
			}

			for(let ii = i + 1; ii < length; ii++){
				if(this.inRange(ii, j) && !this.isOpponentPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, j)) break;
				}
				else break;
			}

			for(let jj = j - 1; jj > -1; jj--){
				if(this.inRange(i, jj) && !this.isOpponentPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(i, jj)) break;
				}
				else break;
			}

			for(let jj = j + 1; jj < length; jj++){
				if(this.inRange(i, jj) && !this.isOpponentPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(i, jj)) break;
				}
				else break;
			}
		}
		else if(type == -5){
			for(let ii = i - 1; ii > -1; ii--){
				if(this.inRange(ii, j) && !this.isOpponentPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, j)) break;
				}
				else break;
			}

			for(let ii = i + 1; ii < length; ii++){
				if(this.inRange(ii, j) && !this.isOpponentPiece(ii, j)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: j}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, j)) break;
				}
				else break;
			}

			for(let jj = j - 1; jj > -1; jj--){
				if(this.inRange(i, jj) && !this.isOpponentPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(i, jj)) break;
				}
				else break;
			}

			for(let jj = j + 1; jj < length; jj++){
				if(this.inRange(i, jj) && !this.isOpponentPiece(i, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: i, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(i, jj)) break;
				}
				else break;
			}

			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1; ii--, jj--){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length; ii++, jj++){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1; ii++, jj--){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length; ii--, jj++){
				if(this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj)){
					let move = {startingPos: {i, j}, endingPos: {i: ii, j: jj}};
					if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
					if(this.isMyPiece(ii, jj)) break;
				}
				else break;
			}
		}
		else if(type == -6){
			if(this.inRange(i - 1, j) && !this.isOpponentPiece(i - 1, j)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 1, j) && !this.isOpponentPiece(i + 1, j)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i, j - 1) && !this.isOpponentPiece(i, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i, j + 1) && !this.isOpponentPiece(i, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i - 1, j + 1) && !this.isOpponentPiece(i - 1, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 1, j + 1) && !this.isOpponentPiece(i + 1, j + 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j + 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i - 1, j - 1) && !this.isOpponentPiece(i - 1, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i - 1, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}

			if(this.inRange(i + 1, j - 1) && !this.isOpponentPiece(i + 1, j - 1)){
				let move = {startingPos: {i, j}, endingPos: {i: i + 1, j: j - 1}};
				if(!this.isAfterMoveKingIsInCheck(move, type, false)) actions.push(move);
			}
		}
		
		return actions;
	},

	isOpponentPiece(i, j){
		return this.grid[i][j] < 0;
	},

	isMyPiece(i, j){
		return this.grid[i][j] > 0;
	},

	inRange(i, j){
		return  i > -1 && i < length && j > -1 && j < length;
	},

	canCheckHere(i, j, me){
		if(me) return  i > -1 && i < length && j > -1 && j < length && this.grid[i][j] == -6;
		else return  i > -1 && i < length && j > -1 && j < length && this.grid[i][j] == 6;
	},

	isAfterMoveKingIsInCheck(move, type, me){
		let typeInNextPlace = this.grid[move.endingPos.i][move.endingPos.j];
		this.grid[move.startingPos.i][move.startingPos.j] = 0;

        if(type == 1 && move.endingPos.i == 0){
            //if this is soldier and he is in the last row in the grid then he will
            //become a queen
            this.grid[move.endingPos.i][move.endingPos.j] = 5;
        }
        else if(type == -1 && move.endingPos.i == 7){
            //if this is soldier and he is in the last row in the grid then he will
            //become a queen
            this.grid[move.endingPos.i][move.endingPos.j] = -5;
        }
        else this.grid[move.endingPos.i][move.endingPos.j] = type;

		let kingInCheck = false;

		if(me){
			for(let i = 0; i < length; i++){
				for(let j = 0; j < length; j++){
					if(this.grid[i][j] < 0){
						if(this.isMyKingInCheck(i, j, this.grid[i][j])){
							kingInCheck = true;
							break;
						}
					}
				}

				if(kingInCheck) break;
			}
		}
		else{
			for(let i = 0; i < length; i++){
				for(let j = 0; j < length; j++){
					if(this.grid[i][j] > 0){
						if(this.isOpKingInCheck(i, j, this.grid[i][j])){
							kingInCheck = true;
							break;
						}
					}
				}

				if(kingInCheck) break;
			}
		}

        this.grid[move.startingPos.i][move.startingPos.j] = type;
		this.grid[move.endingPos.i][move.endingPos.j] = typeInNextPlace;

		return kingInCheck;
	},

	isMyKingInCheck(i, j, type){

		if(type == -1){
			if(this.canCheckHere(i + 1, j - 1, false)) return true;
			
			if(this.canCheckHere(i + 1, j + 1, false)) return true;
		}
		else if(type == -2){
			if(this.canCheckHere(i - 2, j - 1, false)) return true;

			if(this.canCheckHere(i - 2, j + 1, false)) return true;

			if(this.canCheckHere(i + 2, j - 1, false)) return true;

			if(this.canCheckHere(i + 2, j + 1, false)) return true;

			if(this.canCheckHere(i - 1, j - 2, false)) return true;

			if(this.canCheckHere(i + 1, j - 2, false)) return true;

			if(this.canCheckHere(i - 1, j + 2, false)) return true;

			if(this.canCheckHere(i + 1, j + 2, false)) return true;
		}
		else if(type == -3){
			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1 &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii--, jj--){
                if(this.grid[ii][jj] == 6) return true;
                if(this.isMyPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii++, jj++){
                if(this.grid[ii][jj] == 6) return true;
                if(this.isMyPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1 &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii++, jj--){
				if(this.grid[ii][jj] == 6) return true;
				if(this.isMyPiece(ii, jj)) break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii--, jj++){
                if(this.grid[ii][jj] == 6) return true;
                if(this.isMyPiece(ii, jj)) break;
			}
		}
		else if(type == -4){
			for(let ii = i - 1; ii > -1 && 
                this.inRange(ii, j) && !this.isOpponentPiece(ii, j); ii--){
                if(this.grid[ii][j] == 6) return true;
                if(this.isMyPiece(ii, j)) break;
			}

			for(let ii = i + 1; ii < length &&
                this.inRange(ii, j) && !this.isOpponentPiece(ii, j); ii++){
                if(this.grid[ii][j] == 6) return true;
                if(this.isMyPiece(ii, j)) break;
			}

			for(let jj = j - 1; jj > -1 &&
                this.inRange(i, jj) && !this.isOpponentPiece(i, jj); jj--){
                if(this.grid[i][jj] == 6) return true;
                if(this.isMyPiece(i, jj)) break;
			}

			for(let jj = j + 1; jj < length &&
                this.inRange(i, jj) && !this.isOpponentPiece(i, jj); jj++){
                if(this.grid[i][jj] == 6) return true;
                if(this.isMyPiece(i, jj)) break;
			}
		}
		else if(type == -5){
			for(let ii = i - 1; ii > -1 &&
                this.inRange(ii, j) && !this.isOpponentPiece(ii, j); ii--){
                if(this.grid[ii][j] == 6) return true;
                if(this.isMyPiece(ii, j)) break;
			}

			for(let ii = i + 1; ii < length &&
                 this.inRange(ii, j) && !this.isOpponentPiece(ii, j); ii++){
                if(this.grid[ii][j] == 6) return true;
                if(this.isMyPiece(ii, j)) break;
			}

			for(let jj = j - 1; jj > -1 &&
                this.inRange(i, jj) && !this.isOpponentPiece(i, jj); jj--){
                if(this.grid[i][jj] == 6) return true;
                if(this.isMyPiece(i, jj)) break;
			}

			for(let jj = j + 1; jj < length &&
                this.inRange(i, jj) && !this.isOpponentPiece(i, jj); jj++){
                if(this.grid[i][jj] == 6) return true;
                if(this.isMyPiece(i, jj)) break;
			}

			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1 &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii--, jj--){
                if(this.grid[ii][jj] == 6) return true;
                if(this.isMyPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii++, jj++){
                if(this.grid[ii][jj] == 6) return true;
                if(this.isMyPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1 &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii++, jj--){
                if(this.grid[ii][jj] == 6) return true;
                if(this.isMyPiece(ii, jj)) break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length &&
                this.inRange(ii, jj) && !this.isOpponentPiece(ii, jj); ii--, jj++){
                if(this.grid[ii][jj] == 6) return true;
                if(this.isMyPiece(ii, jj)) break;
			}
		}
		else if(type == -6){
			if(this.canCheckHere(i - 1, j, false)) return true;

			if(this.canCheckHere(i + 1, j, false)) return true;

			if(this.canCheckHere(i, j - 1, false)) return true;

			if(this.canCheckHere(i, j + 1, false)) return true;

			if(this.canCheckHere(i - 1, j + 1, false)) return true;

			if(this.canCheckHere(i + 1, j + 1, false)) return true;

			if(this.canCheckHere(i - 1, j - 1, false)) return true;

			if(this.canCheckHere(i + 1, j - 1, false)) return true;
		}
		
		return false;
	},

	isOpKingInCheck(i, j, type){

		if(type == 1){
			if(this.canCheckHere(i + 1, j - 1, true)) return true;
			
			if(this.canCheckHere(i + 1, j + 1, true)) return true;
		}
		else if(type == 2){
			if(this.canCheckHere(i - 2, j - 1, true)) return true;

			if(this.canCheckHere(i - 2, j + 1, true)) return true;

			if(this.canCheckHere(i + 2, j - 1, true)) return true;

			if(this.canCheckHere(i + 2, j + 1, true)) return true;

			if(this.canCheckHere(i - 1, j - 2, true)) return true;

			if(this.canCheckHere(i + 1, j - 2, true)) return true;

			if(this.canCheckHere(i - 1, j + 2, true)) return true;

			if(this.canCheckHere(i + 1, j + 2, true)) return true;
		}
		else if(type == 3){
			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1 &&
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii--, jj--){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length && 
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii++, jj++){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1 &&
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii++, jj--){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length &&
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii--, jj++){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}
		}
		else if(type == 4){
			for(let ii = i - 1; ii > -1 &&
                this.inRange(ii, j) && !this.isMyPiece(ii, j); ii--){
                if(this.grid[ii][j] == -6) return true;
                if(this.isOpponentPiece(ii, j)) break;
			}

			for(let ii = i + 1; ii < length &&
                this.inRange(ii, j) && !this.isMyPiece(ii, j); ii++){
                if(this.grid[ii][j] == -6) return true;
                if(this.isOpponentPiece(ii, j)) break;
			}

			for(let jj = j - 1; jj > -1 &&
                this.inRange(i, jj) && !this.isMyPiece(i, jj); jj--){
                if(this.grid[i][jj] == -6) return true;
                if(this.isOpponentPiece(i, jj)) break;
			}

			for(let jj = j + 1; jj < length &&
                this.inRange(i, jj) && !this.isMyPiece(i, jj); jj++){
                if(this.grid[i][jj] == -6) return true;
                if(this.isOpponentPiece(i, jj)) break;
			}
		}
		else if(type == 5){
			for(let ii = i - 1; ii > -1 &&
                this.inRange(ii, j) && !this.isMyPiece(ii, j); ii--){
                if(this.grid[ii][j] == -6) return true;
                if(this.isOpponentPiece(ii, j)) break;
			}

			for(let ii = i + 1; ii < length &&
                this.inRange(ii, j) && !this.isMyPiece(ii, j); ii++){
                if(this.grid[ii][j] == -6) return true;
                if(this.isOpponentPiece(ii, j)) break;
			}

			for(let jj = j - 1; jj > -1 &&
                this.inRange(i, jj) && !this.isMyPiece(i, jj); jj--){
                if(this.grid[i][jj] == -6) return true;
                if(this.isOpponentPiece(i, jj)) break;
			}

			for(let jj = j + 1; jj < length &&
                this.inRange(i, jj) && !this.isMyPiece(i, jj); jj++){
                if(this.grid[i][jj] == -6) return true;
                if(this.isOpponentPiece(i, jj)) break;
			}

			for(let ii = i - 1, jj = j - 1; ii > -1 && jj > -1 &&
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii--, jj--){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j + 1; ii < length && jj < length && 
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii++, jj++){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}

			for(let ii = i + 1, jj = j - 1; ii < length && jj > -1 &&
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii++, jj--){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}

			for(let ii = i - 1, jj = j + 1; ii > -1 && jj < length &&
                this.inRange(ii, jj) && !this.isMyPiece(ii, jj); ii--, jj++){
                if(this.grid[ii][jj] == -6) return true;
                if(this.isOpponentPiece(ii, jj)) break;
			}
		}
		else if(type == 6){
			if(this.canCheckHere(i - 1, j, true)) return true;

			if(this.canCheckHere(i + 1, j, true)) return true;

			if(this.canCheckHere(i, j - 1, true)) return true;

			if(this.canCheckHere(i, j + 1, true)) return true;

			if(this.canCheckHere(i - 1, j + 1, true)) return true;

			if(this.canCheckHere(i + 1, j + 1, true)) return true;

			if(this.canCheckHere(i - 1, j - 1, true)) return true;

			if(this.canCheckHere(i + 1, j - 1, true)) return true;
		}
		
		return false;
	},

    serializeState(grid, depth){
        let result = "";
        for(let i = 0; i < length; i++){
            for(let j = 0; j < length; j++){
                result += grid[i][j];
            }

            result += " ";
        }

        return result + depth;
    },

    addStateToStates(grid, score, depth){
        this.states.set(this.serializeState(grid, depth), score);
    },

    hasEnconterStateBefore(grid, depth){

        let serializedState = this.serializeState(grid, depth);

        if(!this.states.has(serializedState)) return undefined;
        
        let scoreOfGrid = this.states.get(serializedState);

        return scoreOfGrid;
    }
}

exports.chess = chess;