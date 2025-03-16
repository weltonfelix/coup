import { Card, Game, TurnTypes } from './game.js';

export class CoupActions {
  /**
   * @type {Game}
   */
  #game;

  constructor(game) {
    this.#game = game;
  }

  /**
   *  Realiza um golpe de estado.
   *
   * @param {string} playerId - ID do jogador que está tentando realizar o golpe
   * @param {string} targetPlayerId - ID do jogador que está sendo atacado
   * @returns {object} - Retorna um objeto com a propriedade `ok` indicando se o golpe pode ser realizado.
   * Se `ok` for `false`, a propriedade `failMessage` conterá uma mensagem indicando o motivo do golpe não poder ser realizado.
   */
  coup(playerId, targetPlayerId) {
    const { players } = this.#game.state;

    if (playerId === targetPlayerId) {
      return {
        ok: false,
        failMessage: 'Você não pode realizar um golpe de estado em si mesmo.',
      };
    }
    if (players[playerId].coins < 7) {
      return {
        ok: false,
        failMessage:
          'Você não tem moedas suficientes para realizar um golpe de estado.',
      };
    }

    players[playerId].coins -= 7;
    this.#game.yieldTurn(targetPlayerId, TurnTypes.COUP);
    return { ok: true };
  }

  /**
   * Perde uma carta devido a um golpe de estado sofrido.
   *
   * @param {string} playerId - ID do jogador que sofreu o golpe
   * @param {string} cardName - Nome da carta que será perdida
   * @returns {object} - Retorna um objeto com a propriedade `message` e success, indicando se a ação foi bem sucedida.
   */
  coupDrop(playerId, cardName) {
    if (this.#game.state.turnType !== TurnTypes.COUP) {
      return {
        message:
          'Não é possível descartar uma carta fora do contexto de um golpe de estado.',
        success: false,
      };
    }

    const card = this.#game.dropCard(playerId, cardName);
    if (!card) return {
      message: 'Você não possui essa carta.',
      success: false,
    }
    this.#game.removedCards.push(card)
    this.#game.returnTurn();
    const player = this.#game.state.players[playerId];

    return {
      message: `${player.name} descartou a carta ${cardName}.`,
      success: true,
    };
  }
}
