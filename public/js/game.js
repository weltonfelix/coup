// coup cards
class Card {
  name;
  constructor(name) {
    this.name = name;
  }
}

export class Deck {
  cards;

  constructor() {
    // add 5 cards of each type
    this.cards = [];
    for (let i = 0; i < 5; i++) {
      this.cards.push(new Card('Duque'));
      this.cards.push(new Card('Capitão'));
    }
    console.log(this.cards);
  }

  draw() {
    return this.cards.pop();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const temp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = temp;
    }
  }

  add(card) {
    this.cards.push(card);
  }
}

export class Game {
  state = {
    players: {},
    isStarted: false,
    playerInTurn: null,
  };
  deck = null;
  playerCards = {};

  constructor() {
    this.state = {
      players: {},
      isStarted: false,
    };
    this.deck = null;
    this.playerCards = {};
  }

  updateGame(gameState) {
    this.state = gameState;
  }

  addPlayer(player) {
    this.state.players[player.id] = player;
  }

  removePlayer(playerId) {
    delete this.state.players[playerId];
  }

  startGame() {
    if (this.state.isStarted) {
      return;
    }
    this.state.isStarted = true;

    console.log('Game started');
    this.deck = new Deck();
    this.deck.shuffle();

    // Initial 2 coins
    for (const playerId of Object.keys(this.state.players)) {
      this.#drawInitialPlayerCards(playerId);
      this.state.players[playerId].coins = 2;
    }

    //randomize first player
    this.state.playerInTurn = Object.keys(this.state.players)[
      Math.floor(Math.random() * Object.keys(this.state.players).length)
    ];
    //TODO: implement game logic
  }

  nextTurn() {
    const players = Object.keys(this.state.players);
    const currentPlayerIndex = players.indexOf(this.state.playerInTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    this.state.playerInTurn = players[nextPlayerIndex];
  }

  #drawInitialPlayerCards(playerId) {
    this.playerCards[playerId] = [this.deck.draw(), this.deck.draw()];
  }

  #drawCoins(playerId, amount) {
    this.state.players[playerId].coins += amount;
  }

  // renda
  income(playerId) {
    this.#drawCoins(playerId, 1);
  }

  // ajuda externa
  foreignAid(playerId) {
    this.#drawCoins(playerId, 2);
  }

  // duque
  tax(playerId) {
    this.#drawCoins(playerId, 3);
  }

  // capitão
  steal(playerId, targetPlayerId) {
    this.state.players[playerId].coins = min(
      this.state.players[playerId].coins + 2,
      this.state.players[targetPlayerId].coins +
        this.state.players[playerId].coins
    );
    this.state.players[targetPlayerId].coins = max(
      0,
      this.state.players[targetPlayerId].coins - 2
    );
  }

  stopGame() {
    this.state.isStarted = false;
    this.deck = null;
    this.playerCards = {};
  }
}
