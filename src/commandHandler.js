import { Game } from "../public/js/game.js";

export class CommandHandler {
  /**
   * @type {Game}
   */
  game;
  constructor(game) {
    this.game = game;
  }

  startGame(sockets) {
    const success = this.game.startGame();
    if (!success) {
      return false;
    }
    this.#distributeCards(sockets);
    return true;
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
}
