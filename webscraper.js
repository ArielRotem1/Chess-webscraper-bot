require("dotenv").config();
const puppeteer = require("puppeteer");
const chess = require("./chess");

const DEBUG = process.env.DEBUG === "true";

const width = 1200;
const height = 700;

const webscraper = {

    browser: undefined,
    page: undefined,
    myColor: undefined,

    async init() {
        browser = await puppeteer.launch({ headless: false, "defaultViewport": { "width": width, "height": height } })
        page = await browser.newPage();
        await page.setViewport({ width: width, height: height });
    },

    async startGame(gameDifficulty) {
        //const urlPage = 'https://www.chess.com/home';
        const urlPage = 'https://www.chess.com/play/online';
        await page.goto(urlPage, { waitUntil: 'networkidle2' });
        await this.wait(1000);

        //play button click
        let playButton = await page.$("#board-layout-sidebar > div > div.tab-container-component.tab-content-component > div > div.new-game-index-content > div > button");
        await playButton.click();
        await this.wait(100);

        //wait for selector 'playAsGuestButton'
        await page.waitForSelector("#guest-button");
        await this.wait(1000);

        if (gameDifficulty == "intermediate") {
            let intermediateButton = await page.$("body > div.authentication-modal-component > div > div > div.authentication-intro-component > div > label:nth-child(3)");
            await intermediateButton.click();
            await this.wait(1000);
        }
        else if (gameDifficulty == "expert") {
            let expertButton = await page.$("body > div.authentication-modal-component > div > div > div.authentication-intro-component > div > label:nth-child(4)")
            await expertButton.click();
            await this.wait(1000);
        }

        //play as a guest button click
        let playAsGuestButton = await page.$("#guest-button");
        await playAsGuestButton.click();


        await this.wait(5000);

        let startPlay = await page.$("#board-layout-sidebar > div > div.tab-container-component.tab-content-component > div > div.new-game-index-content > div > button")
        if (startPlay != null) {
            await startPlay.click();
        }

        console.log("Waiting for game to start...");

        let gameStarted = false;

        await this.waitForGameToStart(gameStarted);
    },

    async waitForGameToStart(gameStarted) {

        if (gameStarted) return true;

        await this.wait(250);

        try {
            console.log("checking if game has start");
            gameStarted = await page.evaluate(() => {
                let opponentName = document.querySelector("#board-layout-player-top > div > div.player-tagline > div > a")
                if (opponentName == null) {
                    return false;
                }

                opponentName = opponentName.innerText;
                return opponentName != "Opponent";
            });
            console.log("checking if game has start: " + gameStarted);
        }
        catch (err) {
            console.log("There was error in gameStarted...: " + err);
            gameStarted = false;
        }

        if (gameStarted) {
            console.log("Game Start!!");
            console.log();
        }

        return await this.waitForGameToStart(gameStarted);
    },

    async getMyColor() {
        let isMyTurn = await this.whosTurn();
        if (DEBUG) console.log("isMyTurn: " + isMyTurn);

        if (isMyTurn) this.myColor = "w";
        else this.myColor = "b";

        if (DEBUG) console.log("this.myColor: " + this.myColor)

        return this.myColor;
    },

    async wait(numberOfMilliseconds) {
        await page.waitForTimeout(numberOfMilliseconds);
    },

    async whosTurn() {
        //document.querySelector("#board-layout-player-bottom > div > div.clock-component.clock-black.clock-bottom.clock-live.clock-running.player-clock.clock-low-time.clock-player-turn")
        let isMyturn = await page.evaluate(() => {
            let div = document.querySelector("#board-layout-player-bottom > div").getElementsByTagName("div")[9];
            let myTurn = div.classList.value.includes("clock-player-turn");
            return myTurn;
        });

        return isMyturn;
    },

    async createGrid() {

        let dict = {
            "p": 1,
            "n": 2,
            "b": 3,
            "r": 4,
            "q": 5,
            "k": 6
        };

        let grid = await page.evaluate((dict, myColor) => {
            let grid = [];

            for (let i = 0; i < 8; i++) {
                grid[i] = new Int8Array(8);
            }

            let pieces = Array.from(document.querySelector(`#board-single`).getElementsByClassName("piece"));
            for (pieceElement of pieces) {
                let pieceClassList = pieceElement.classList;
                let pieceColor;
                let pieceType;
                let pieceLocationString;
                let pieceLocation;
                if (pieceClassList[1].length == 2) {
                    pieceColor = pieceClassList[1][0];
                    pieceType = pieceClassList[1][1];
                    pieceLocationString = pieceClassList[2].split("-")[1];
                    pieceLocation = { row: parseInt(pieceLocationString[1]), col: parseInt(pieceLocationString[0]) }
                }
                else if (pieceClassList[2].length == 2) {
                    pieceColor = pieceClassList[2][0];
                    pieceType = pieceClassList[2][1];
                    pieceLocationString = pieceClassList[1].split("-")[1];
                    pieceLocation = { row: parseInt(pieceLocationString[1]), col: parseInt(pieceLocationString[0]) }
                }


                if (myColor == "w") {
                    pieceLocation.row = 8 - pieceLocation.row;
                    pieceLocation.col -= 1;
                }
                else if (myColor == "b") {
                    pieceLocation.row -= 1;
                    pieceLocation.col = 8 - pieceLocation.col;
                }

                if (myColor == pieceColor) grid[pieceLocation.row][pieceLocation.col] = dict[pieceType];
                else grid[pieceLocation.row][pieceLocation.col] = -dict[pieceType];
            }
            return grid;
        }, dict, this.myColor);

        return grid;
    },

    async doAction(action) {
        if (this.myColor == "w") {
            let startRow = 8 - action.startingPos.i;
            let startCol = action.startingPos.j + 1;
            let type = chess.chess.grid[action.startingPos.i][action.startingPos.j];

            let res = await this.startClickSquare(startRow, startCol);

            let endRow = 8 - action.endingPos.i;
            let endCol = action.endingPos.j + 1;

            await this.endClickSquare(startRow, startCol, endRow, endCol, res);

            if (action.endingPos.i == 0 && type == 1) {
                //turn pawn into queen
                await this.endClickSquare(startRow, startCol, endRow, endCol, res);
            }
        }
        else {
            let startRow = action.startingPos.i + 1;
            let startCol = 8 - action.startingPos.j;
            let type = chess.chess.grid[action.startingPos.i][action.startingPos.j];

            let res = await this.startClickSquare(startRow, startCol);

            let endRow = action.endingPos.i + 1;
            let endCol = 8 - action.endingPos.j;

            await this.endClickSquare(startRow, startCol, endRow, endCol, res);

            if (action.endingPos.i == 0 && type == 1) {
                //turn pawn into queen
                await this.endClickSquare(startRow, startCol, endRow, endCol, res);
            }
        }
    },

    async startClickSquare(row, col) {
        let box = await page.evaluate((row, col) => {

            let pieces = Array.from(document.querySelector(`#board-single`).getElementsByClassName("piece"));

            for (pieceElement of pieces) {
                let pieceClassList = pieceElement.classList;
                let pieceColor;
                let pieceType;
                let pieceLocationString;
                let pieceLocation;
                if (pieceClassList[1].length == 2) {
                    pieceColor = pieceClassList[1][0];
                    pieceType = pieceClassList[1][1];
                    pieceLocationString = pieceClassList[2].split("-")[1];
                    pieceLocation = { row: parseInt(pieceLocationString[1]), col: parseInt(pieceLocationString[0]) }
                }
                else if (pieceClassList[2].length == 2) {
                    pieceColor = pieceClassList[2][0];
                    pieceType = pieceClassList[2][1];
                    pieceLocationString = pieceClassList[1].split("-")[1];
                    pieceLocation = { row: parseInt(pieceLocationString[1]), col: parseInt(pieceLocationString[0]) }
                }

                if (pieceLocation.row == row && pieceLocation.col == col) {
                    let b = document.querySelector(`#board-single > div.piece.${pieceColor}${pieceType}.square-${col}${row}`).getBoundingClientRect();
                    return { left: b.left, width: b.width, top: b.top, height: b.height }
                }
            }
        }, row, col);


        await page.mouse.move(box.left + box.width / 2, box.top + box.height / 2);
        await page.mouse.click(box.left + box.width / 2, box.top + box.height / 2);

        return { middleJ: box.left + box.width / 2, middleI: box.top + box.height / 2, width: box.width, height: box.height };
    },

    async endClickSquare(startRow, startCol, row, col, prevSquare) {

        let pixelRow = prevSquare.middleI;
        let pixelCol = prevSquare.middleJ;

        if (this.myColor == "w") {
            if (startRow > row) {
                pixelRow += prevSquare.height * (startRow - row)
            }
            else {
                pixelRow -= prevSquare.height * (row - startRow)
            }

            if (startCol > col) {
                pixelCol -= prevSquare.width * (startCol - col)
            }
            else {
                pixelCol += prevSquare.width * (col - startCol)
            }
        }
        else {
            if (startRow > row) {
                pixelRow -= prevSquare.height * (startRow - row)
            }
            else {
                pixelRow += prevSquare.height * (row - startRow)
            }

            if (startCol > col) {
                pixelCol += prevSquare.width * (startCol - col)
            }
            else {
                pixelCol -= prevSquare.width * (col - startCol)
            }
        }


        await page.mouse.move(pixelCol, pixelRow);
        await page.mouse.click(pixelCol, pixelRow);
    },

    async isGameOver() {
        let isOver = await page.evaluate(() => {

            let overMessage = document.querySelector("#board-layout-chessboard > div.board-modal-container > div > div");
            let gameIsOver = overMessage != null;

            if (gameIsOver)
                return document.querySelector("#board-layout-chessboard > div.board-modal-container > div > div > div.board-modal-header-component.game-over-header-component > div").innerText;
            else
                return undefined;
        });

        return isOver;
    },

    async resign() {
        let resign = await page.$("#board-layout-sidebar > div > div.tab-container-component.tab-content-component > div.live-game-buttons-component > div > div.live-game-buttons-button-group > div.resign-button-component")
        await resign.click();

        let agreeResigning = await page.$("#board-layout-sidebar > div > div.tab-container-component.tab-content-component > div.live-game-buttons-component > div > div.live-game-buttons-button-group > div.resign-button-component > div > button.ui_v5-button-component.ui_v5-button-primary.ui_v5-button-small")
        await agreeResigning.click();
    },

    async end() {
        await browser.close();
    }
}

exports.webscraper = webscraper;
