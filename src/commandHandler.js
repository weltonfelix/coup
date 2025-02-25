export class CommandHandler {
  game;
  constructor(game) {
    this.game = game;
  }

  startGame(sockets) {
    this.game.startGame();
    this.#distributeCards(sockets);
    
    const playerInTurn = this.game.state.playerInTurn;
    return this.#getPlayersOrder(playerInTurn);
  }

  stopGame() {
    this.game.stopGame();
  }

  #distributeCards(sockets) {
    for (const playerId of Object.keys(this.game.state.players)) {
      const playerSocket = sockets.get(playerId);
      if (!playerSocket) {
        console.error(`Player ${playerId} not found`);
        continue;
      }
      playerSocket.emit('gameStarted', {
        cards: this.game.playerCards[playerId],
      });
    }
  }

  #getPlayersOrder(playerInTurn) {
    const playersOrder = [playerInTurn];
    this.game.nextTurn(); // Skip the player in turn
    while (this.game.state.playerInTurn !== playerInTurn) {
      playersOrder.push(this.game.state.playerInTurn);
      this.game.nextTurn();
    }

    return playersOrder.map(
      (playerId) => this.game.state.players[playerId].name
    );
  }
}