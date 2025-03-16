import { Game, TurnTypes } from '../game.js';

export class AssassinActions {
  /**
   * @type {Game}
   */
  #game;

  constructor(game) {
    this.#game = game;
  }

  /**
   * Tenta realizar um assassinato
   * @param {string} assassinId O id do jogador que está jogando a carta de assassino
   * @param {string} targetId O id do jogador que será morto
   * @returns {object} Retorna um objeto com a propriedade `message` indicando a mensagem a ser exibida
   * e a propriedade `success` indicando se o assassinato foi bem sucedido.
   */
  killAttempt(assassinId, targetId) {
    if (assassinId === targetId)
      return {
        message: 'Você não pode se matar.',
        success: false,
      };

    const assassin = this.#game.state.players[assassinId];
    if (assassin.coins < 3) {
      return {
        message:
          'Você não tem moedas suficientes para realizar um assassinato.',
        success: false,
      };
    }

    const target = this.#game.state.players[targetId];
    if (!this.#game.isPlayerInGame(target.id)) {
      return {
        message: 'O jogador alvo não está mais no jogo.',
        success: false,
      };
    }

    assassin.coins -= 3;

    this.#game.yieldTurn(targetId, TurnTypes.ASSASSIN);

    return {
      message: `${assassin.name} tentou assassinar ${target.name}. ${target.name} pode se defender com a Condessa (/condessa) ou descartar uma carta (/coupdrop).`,
      success: true,
    };
  }

  /**
   * O assassino mata um jogador
   * @param {string} assassinId O id do jogador que está jogando a carta de assassino
   * @param {string} targetId O id do jogador que será morto
   * @returns {object} Retorna um objeto com a propriedade `message` indicando a mensagem a ser exibida
   * e a propriedade `success` indicando se o assassinato foi bem sucedido.
   */
  kill(assassinId, targetId) {
    if (assassinId === targetId)
      return {
        message: 'Você não pode se matar.',
        success: false,
      };

    this.#game.yieldTurn(targetId, TurnTypes.DROP_CARD);

    return {
      message: `${this.#game.state.players[assassinId].name} assassinou ${
        this.#game.state.players[targetId].name
      }.`,
      success: true,
    };
  }

  /**
   * Descarta uma carta devido a um assassinato sofrido.
   * @param {string} playerId O id do jogador que sofreu o assassinato
   * @param {string} cardName O nome da carta que será descartada
   * @returns {object} Retorna um objeto com a propriedade `message` e `success`, indicando se a ação foi bem sucedida.
   */
  assassinCardDrop(playerId, cardName) {
    if (this.#game.state.turnType !== TurnTypes.ASSASSIN) {
      return {
        message:
          'Não é possível descartar uma carta fora do contexto de um assassinato.',
        success: false,
      };
    }

    const card = this.#game.dropCard(playerId, cardName);
    if (!card)
      return {
        message: 'Você não possui essa carta.',
        success: false,
      };

    this.#game.removedCards.push(card);
    this.#game.returnTurn();
    const player = this.#game.state.players[playerId];

    return {
      message: `${player.name} descartou a carta ${cardName} pelo assassinato.`,
      success: true,
    };
  }
}
