# Chess-webscraper-bot
Chess bot that plays against real players at chess.com.<br>
Using <b>minimax algorithm + alpha beta pruning + states duplication handling</b>.<br>
The bot is also thinking during the opponent turn to save time, using <b>asynchronous programming</b>.

<b>Instructions to run:</b>
1) Download the repo
2) Choose the difficulty level of the opponent by setting the <i>gameDifficulty</i> variable in the top of "main.js" file to one of the following options:
   - "beginner"
   - "intermediate" (set as default)
   - "expert"
4) Enter in the terminal: "npm install"
3) Enter in the terminal: "node main.js"
