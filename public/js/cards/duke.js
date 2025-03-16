export class DukeActions {
  #game;

  constructor(game) {
    this.#game = game;
  }

  /**
   * Cobra imposto. Isto é, dá 3 moedas para o jogador.
   * @param {string} _playerId - ID do jogador
   * @returns {number} Quantidade de moedas que o jogador recebeu
   */
  tax(_playerId) {
    return 3;
  }

  //TODO: Implementar ações do Duque (bloquear ajuda externa)
}