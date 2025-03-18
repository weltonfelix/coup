import { Game } from "../public/js/game.js";

export class GameActionHandler {
  /**
   * @type {Game}
   */
  game;

  constructor(game) {
    this.game = game;
  }

  drawCoins(player, amountToDraw) {
    const amount = parseInt(amountToDraw) || 0;
    return this.game.drawCoins(player.id, amount);
  }

  payCoins(player, amountToPay) {
    const amount = parseInt(amountToPay) || 0;
    return this.game.payCoins(player.id, amount);
  }

  dropCardMurder(player, cardName) {
    return this.game.dropCardMurder(player.id, cardName);
  }

  dropCardCoup(player, cardName) {
    return this.game.dropCardCoup(player.id, cardName);
  }

  exchangeCard(player, cardName) {
    return this.game.exchangeCard(player.id, cardName);
  }

  ambassador(player) {
    return this.game.ambassador(player.id);
  }

  returnCards(player, cards) {
    //console.log('returnCards', player, cardNames);
    return this.game.returnCards(player.id, cards);
  }
}
