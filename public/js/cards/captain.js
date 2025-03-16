import { Game } from '../game.js';

export class CaptainActions {
  /**
   * @type {Game}
   */
  #game;

  constructor(game) {
    this.#game = game;
  }

  /**
   * Tentativa de roubo. Este método prepara o roubo de moedas de um jogador.
   * @param {string} playerId - ID do jogador que está tentando roubar
   * @param {string} targetPlayerId - ID do jogador que está sendo roubado
   * @returns {boolean} Retorna `true` se o roubo foi iniciado com sucesso, ou `false` se não for possível
   */
  stealAttempt(playerId, targetPlayerId) {
    const { state } = this.#game;
    const amount = Math.min(state.players[targetPlayerId].coins, 2); // Define o valor do roubo

    state.turnType = TurnTypes.STEAL; // O turno agora é de roubo
    state.playerInTurn = playerId; // O turno vai para a vítima, pois ela tem a chance de bloquear ou aceitar

    state.gameEvents.steal = {
      playerId,
      targetPlayerId,
      amount,
    };

    this.#game.yieldTurn(targetPlayerId, TurnTypes.STEAL); // O jogador alvo é notificado do roubo

    return true; // Tentativa de roubo iniciada
  }

  /**
   * Aceita o roubo de moedas sofrido. Ou seja, o jogador aceita perder moedas.
   * @returns {number|boolean} Retorna a quantidade de moedas roubadas, ou `false` se o jogador alvo não está mais no jogo
   */
  acceptSteal() {
    const { playerId, targetPlayerId, amount } =
      this.#game.state.gameEvents.steal;

    this.#game.state.players[playerId].coins += amount; // O jogador que roubou recebe as moedas
    this.#game.state.players[targetPlayerId].coins -= amount; // A vítima perde as moedas

    this.#game.state.turnType = TurnTypes.REGULAR; // O turno volta a ser normal após o roubo
    this.#game.state.playerInTurn = playerId; // O turno volta para quem roubou

    this.#game.state.gameEvents.steal = null; // O roubo é concluído

    this.#game.returnTurn();
    return amount; // Retorna a quantidade de moedas roubadas
  }

  /**
   * Tenta bloquear um roubo.
   * @returns {boolean} Retorna `true` se a tentativa de bloqueio pode acontecer.
   */
  blockStealAttempt() {
    const { state } = this.#game;
    if (state.turnType !== TurnTypes.STEAL) return false; // Não é possível bloquear um roubo fora do contexto de um roubo
    return true;
  }

  /**
   * Bloqueia um roubo. Ou seja, impede que o roubo aconteça e o turno não é alterado.
   * @returns {boolean} Retorna `true` se o bloqueio for bem-sucedido, ou `false` se não houver um roubo ativo
   */
  blockSteal() {
    // Impede que o roubo aconteça, mas não altera as moedas
    this.#game.state.gameEvents.steal = null; // O roubo é cancelado
    this.#game.returnTurn();
    return true; // Bloqueio bem-sucedido
  }
}
