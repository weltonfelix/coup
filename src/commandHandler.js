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
      playerSocket.emit('updateCards', {
        cards: this.game.playerCards[playerId],
      });
    }
  }

  #getPlayersOrder(playerInTurn) {
    const playersOrder = [playerInTurn];
    while (this.game.state.playerInTurn !== playerInTurn) {
      playersOrder.push(this.game.state.playerInTurn);
    }

    return Object.values(this.game.state.players).map(
      (player) => player.name
    );
  }
}
