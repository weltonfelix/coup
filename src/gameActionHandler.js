export class GameActionHandler{
  game;

  constructor(game){
    this.game = game;
  }

  income(player){
    this.game.income(player.id);
    console.log(`${player.name} pegou renda (1 moeda).`);
    return `${player.name} pegou renda (1 moeda).`;
  }

  foreignAid(player){
    this.game.foreignAid(player.id);
    return `${player.name} pediu ajuda externa (2 moedas).`;
  }

  steal(player, target){
    const amount = this.game.steal(player.id, this.game.getPlayerByName(target).id);
    return `${player.name} roubou ${amount} moeda${amount !== 1 ? 's' : ''} de ${target}.`;
  }

  tax(player){
    this.game.tax(player.id);
    return `${player.name} pediu imposto (3 moedas).`;
  }
}