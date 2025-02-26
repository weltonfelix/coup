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
  coupedCards = [];
  playerCards = {};

  constructor() {
    this.state = {
      players: {},
      isStarted: false,
      playerInTurn: null,
    };
    this.deck = null;
    this.playerCards = {};
    this.coupedCards = [];
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

  #isAlive(playerId) {
    return this.playerCards[playerId]?.length > 0;
  }

  startGame() {
    if (this.state.isStarted) {
      return;
    }
    this.state.isStarted = true;

    console.log('Game started');
    this.deck = new Deck();
    this.deck.shuffle();

    // Initial 2 coins and 2 cards for each player
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
    while (!this.#isAlive(this.state.playerInTurn)) {
      this.nextTurn();
    }
  }
  #drawInitialPlayerCards(playerId) {
    this.playerCards[playerId] = [this.deck.draw(), this.deck.draw()];
  }

  #drawCoins(playerId, amount) {
    this.state.players[playerId].coins += amount;
  }

  getPlayerByName(name) {
    for (const [_id, player] of Object.entries(this.state.players)) {
      if (player.name === name) return player;
    }
    return null;
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
    if (!this.#isAlive(targetPlayerId)) return false;
    const amountStealed = Math.min(this.state.players[targetPlayerId].coins, 2);

    this.state.players[playerId].coins =
      this.state.players[playerId].coins + amountStealed;
    this.state.players[targetPlayerId].coins =
      this.state.players[targetPlayerId].coins - amountStealed;

    return amountStealed;
  }

  // perder carta
  /**
   * Remove uma carta do jogador
   * @param string playerId ID do jogador que está perdendo a carta
   * @param string cardName Nome da carta que será removida
   * @returns {Card|null} Retorna a carta removida, ou null se a carta
   * não foi encontrada
   */
  dropCard(playerId, cardName) {
    if (!this.#isAlive(playerId)) return null;
    const index = this.playerCards[playerId].findIndex(
      (c) => c.name.toLowerCase() === cardName.toLowerCase()
    );

    if (index !== -1) {
      console.log('Card removed:', this.playerCards[playerId]);
      const removedCard = this.playerCards[playerId].splice(index, 1)[0];
      console.log('Player cards:', this.playerCards[playerId]);
      return removedCard;
    } else {
      return null;
    }
  }

  /**
   *  Tenta realizar um golpe de estado.
   *
   * @param {string} playerId - ID do jogador que está tentando realizar o golpe
   * @param {string} targetPlayerId - ID do jogador que está sendo atacado
   * @returns {object} - Retorna um objeto com a propriedade `ok` indicando se o golpe pode ser realizado.
   * Se `ok` for `false`, a propriedade `failMessage` conterá uma mensagem indicando o motivo do golpe não poder ser realizado.
   */
  coupAttempt(playerId, targetPlayerId) {
    if (this.state.players[playerId].coins < 7) {
      return {
        ok: false,
        failMessage: 'Você não tem moedas suficientes para realizar um golpe de estado.',
      };
    }
    if (!this.#isAlive(targetPlayerId)) {
      return {
        ok: false,
        failMessage: 'O jogador alvo não está mais no jogo.',
      };
    }
    this.state.players[playerId].coins -= 7;
    return { ok: true };
  }

  /**
   *  Perde uma carta devido a um golpe de estado sofrido.
   *
   * @param {string} playerId - ID do jogador que sofreu o golpe
   * @param {string} cardName - Nome da carta que será perdida
   * @returns {Card|null} - Retorna a carta removida, ou null se o golpe não pôde ser realizado.
   */
  coup(playerId, cardName) {
    const card = this.dropCard(playerId, cardName);
    if (card) this.coupedCards.push(card);
    return card;
  }

  stopGame() {
    this.state.isStarted = false;
    this.deck = null;
    this.playerCards = {};
  }
}
