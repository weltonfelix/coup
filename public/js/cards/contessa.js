import { Game, TurnTypes } from '../game.js';

export class ContessaActions {
  /**
   * @type {Game}
   */
  #game;

  constructor(game) {
    this.#game = game;
  }

  /**
   * Tenta realizar uma defesa contra um assassinato.
   * 
   * @param {string} contessaId ID do jogador que está tentando se defender
   * @returns {object} Retorna um objeto com a propriedade `message` indicando a mensagem a ser exibida
   * e a propriedade `success` indicando se a defesa foi bem sucedida.
   */
  defenseAttempt(contessaId) {
    if (this.#game.state.turnType !== TurnTypes.ASSASSIN) return {
      message: 'Não é possível usar a Condessa fora do contexto de um assassinato.',
      success: false,
    };

    const contessa = this.#game.state.players[contessaId];
    return {
      message: `${contessa.name} está tentando usar a Condessa para bloquear o assassinato!`,
      success: true,
    };
  }

  /**
   * Realiza a defesa com a Condessa.
   * 
   * @returns {object} Retorna um objeto com a propriedade `message` indicando a mensagem a ser exibida
   * e a propriedade `success` indicando se a defesa foi bem sucedida.
   */
  defense() {
    this.#game.returnTurn();
    return {
      message: 'O assassinato foi bloqueado pela Condessa.',
      success: true,
    };
  }
}
