export class GameActionHandler {
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

  coupAttempt(player, target) {
    const result = this.game.coupAttempt(
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
        targetId: this.game.getPlayerByName(target).id,
      };
    }
  }
  
    coup(player, cardName) {
      const card = this.game.coup(player.id, cardName);
      if (!card) return false;
      return `${player.name} descartou ${card.name} por um golpe.`;
    }

    assassin(player, target) {
      const targetPlayer = this.game.getPlayerByName(target);
      if (!targetPlayer) {
        return {
          message: 'Jogador alvo não encontrado.',
          success: false,
        };
      }
    
      if (player.coins < 3) {
        return {
          message: 'Você não tem moedas suficientes para realizar um assassinato.',
          success: false,
        };
      }
    
      if (!this.game.isPlayerInGame(targetPlayer.id)) {
        return {
          message: 'O jogador alvo não está mais no jogo.',
          success: false,
        };
      }
    
      player.coins -= 3;
    
      return {
        message: `${player.name} tentou assassinar ${target}. ${target} pode se defender com a Condessa (/condessa) ou descartar uma carta (/coupdrop).`,
        success: true,
        targetId: targetPlayer.id,
      };
    }

    condessa(player) {
      const targetPlayer = this.game.getPlayerByName(player.name);
      if (!targetPlayer) {
        return {
          message: 'Jogador alvo não encontrado.',
          success: false,
        };
      }
    
      const hasCondessa = this.game.playerCards[targetPlayer.id].some(
        (card) => card.name === 'Condessa'
      );
    
      if (hasCondessa) {
        return {
          message: `${player.name} se defendeu com a Condessa e bloqueou o assassinato.`,
          success: true,
        };
      } else {
        return {
          message: `${player.name} tentou se defender com a Condessa, mas não a possuía e perdeu uma carta.`,
          success: false,
        };
      }
    }
}
