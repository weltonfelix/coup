import { Game } from "../public/js/game.js";

export class GameActionHandler {
  /**
   * @type {Game}
   */
  game;

  constructor(game) {
    this.game = game;
  }

  income(player) {
    this.game.income(player.id);
    console.log(`${player.name} pegou renda (1 moeda).`);
    return `${player.name} pegou renda (1 moeda).`;
  }

  foreignAid(player) {
    this.game.foreignAid(player.id);
    return `${player.name} pediu ajuda externa (2 moedas).`;
  }

  steal(player, target) {
    const amount = this.game.steal(
      player.id,
      this.game.getPlayerByName(target).id
    );
    return `${player.name} roubou ${amount} moeda${
      amount !== 1 ? 's' : ''
    } de ${target}.`;
  }

  tax(player) {
    this.game.tax(player.id);
    return `${player.name} pediu imposto (3 moedas).`;
  }

  coup(player, target) {
    const result = this.game.coup(
      player.id,
      this.game.getPlayerByName(target)?.id
    );
    if (result.ok) {
      return {
        message: `${player.name} deu um golpe em ${target}.`,
        proceed: true,
        targetId: this.game.getPlayerByName(target).id,
      };
    } else {
      return {
        message: result.failMessage,
        proceed: false,
        targetId: this.game.getPlayerByName(target)?.id,
      };
    }
  }

  coupDrop(player, cardName) {
    return this.game.coupCardDrop(player.id, cardName);
  }

  assassin(player, target) {
    const targetPlayer = this.game.getPlayerByName(target);
    if (!targetPlayer) {
      return {
        message: 'Jogador alvo não encontrado.',
        success: false,
      };
    }

    return this.game.assassinAttempt(player.id, targetPlayer.id);
  }

  contessa(player) {
    this.game.defenseAttempt(player.id);
    return this.game.defense();
  }

  assassinDrop(player, cardName) {
    return this.game.assassinCardDrop(player.id, cardName);
  }
}
