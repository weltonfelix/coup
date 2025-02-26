/**
 * @typedef {object} Player
 * @property {string} id - ID do jogador
 * @property {string} name - Nome do jogador
 * @property {number} coins - Quantidade de moedas do jogador
 */

/**
 * Carta do jogo
 * @class
 * @property {string} name - Nome da carta
 * @constructor
 * @param {string} name - Nome da carta
 */
class Card {
  name;
  constructor(name) {
    this.name = name;
  }
}

/**
 * Baralho do jogo
 * @class
 * @property {Card[]} cards - Cartas do baralho
 * @constructor
 * @param {Card[]} cards - Cartas do baralho
 * @method draw - Retira uma carta do baralho
 */
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

  /**
   * Retira uma carta do baralho
   * @returns {Card} Retorna a carta retirada do baralho
   */
  draw() {
    return this.cards.pop();
  }

  /**
   * Embaralha as cartas do baralho
   * @returns {void}
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * i);
      const temp = this.cards[i];
      this.cards[i] = this.cards[j];
      this.cards[j] = temp;
    }
  }

  /**
   * Adiciona uma carta ao baralho
   * @param {Card} card - Carta a ser adicionada ao baralho
   * @returns {void}
   */
  add(card) {
    this.cards.push(card);
  }
}

/**
 * Jogo
 * @class
 */
export class Game {
  /**
   * Estado do jogo
   * @typedef {object} GameState
   * @property {object.<string, Player>} players - Jogadores do jogo
   * @property {boolean} isStarted - Indica se o jogo está iniciado
   * @property {string} playerInTurn - ID do jogador em turno
   */
  state = {
    players: {},
    isStarted: false,
    playerInTurn: null,
  };
  /**
   * Baralho do jogo
   * @type {Deck}
   */
  deck = null;
  /**
   * Cartas retiradas do jogo
   * @type {Card[]}
   */
  coupedCards = [];
  /**
   * Cartas dos jogadores
   * @type {object.<string, Card[]>}
   * @example
   * {
   *  'player1': [new Card('Duque'), new Card('Capitão')],
   *  'player2': [new Card('Duque'), new Card('Capitão')],
   * }
   */
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

  /**
   * Substitui o estado do jogo
   * @param {GameState} gameState - Novo estado do jogo
   * @returns {void}
   */
  updateGame(gameState) {
    this.state = gameState;
  }

  /**
   * Adiciona um jogador ao jogo
   * @param {Player} player - Jogador a ser adicionado
   */
  addPlayer(player) {
    this.state.players[player.id] = player;
  }

  /**
   * Remove um jogador do jogo
   * @param {string} playerId - ID do jogador a ser removido
   */
  removePlayer(playerId) {
    delete this.state.players[playerId];
  }

  /**
   * Verifica se um jogador está vivo
   * @param {string} playerId - ID do jogador
   * @returns {boolean} Retorna `true` se o jogador está vivo, `false` caso contrário
   * @private
   */
  #isAlive(playerId) {
    return this.playerCards[playerId]?.length > 0;
  }

  /**
   * Inicia o jogo, caso ainda não tenha sido iniciado.
   * Embaralha um novo baralho e distribui 2 cartas e 2 moedas para cada jogador.
   * Além disso, define um jogador aleatório para começar.
   * @returns {void}
   */
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
  }

  /**
   * Passa o turno para o próximo jogador, de acordo com a ordem dos jogadores.
   * @returns {void}
   */
  nextTurn() {
    const players = Object.keys(this.state.players);
    const currentPlayerIndex = players.indexOf(this.state.playerInTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    this.state.playerInTurn = players[nextPlayerIndex];
    while (!this.#isAlive(this.state.playerInTurn)) {
      this.nextTurn();
    }
  }

  /**
   * Distribui 2 cartas iniciais para um jogador
   * @param {string} playerId - ID do jogador
   * @returns {void}
   * @private
   */
  #drawInitialPlayerCards(playerId) {
    this.playerCards[playerId] = [this.deck.draw(), this.deck.draw()];
  }

  /**
   * Dá moedas a um jogador
   * @param {string} playerId - ID do jogador
   * @param {number} amount - Quantidade de moedas a ser dada
   * @returns {void}
   * @private
   */
  #drawCoins(playerId, amount) {
    this.state.players[playerId].coins += amount;
  }

  /**
   * Retorna um jogador pelo nome
   * @param {string} name - Nome do jogador
   * @returns {Player|null} Retorna o jogador, ou `null` se não encontrado
   */
  getPlayerByName(name) {
    for (const [_id, player] of Object.entries(this.state.players)) {
      if (player.name.toLowerCase() === name.toLowerCase()) return player;
    }
    return null;
  }

  /**
   * Distribui renda para um jogador. Isto é, dá 1 moeda para o jogador.
   * @param {string} playerId - ID do jogador
   * @returns {void}
   */
  income(playerId) {
    this.#drawCoins(playerId, 1);
  }

  /**
   * Pede ajuda externa. Isto é, dá 2 moedas para o jogador.
   * @param {string} playerId - ID do jogador
   * @returns {void}
   */
  foreignAid(playerId) {
    this.#drawCoins(playerId, 2);
  }

  /**
   * Pede imposto. Isto é, dá 3 moedas para o jogador. Ação do Duque.
   * @param {string} playerId - ID do jogador
   * @returns {void}
   */
  tax(playerId) {
    this.#drawCoins(playerId, 3);
  }

  /**
   * Tenta aceitar suborno de um jogador. Isto é, roubar 2 moedas de um jogador.
   * @param {string} playerId - ID do jogador que está tentando roubar
   * @param {string} targetPlayerId - ID do jogador que está sendo roubado
   * @returns {number|boolean} Retorna a quantidade de moedas roubadas, ou `false` se o jogador alvo não está mais no jogo
   */
  steal(playerId, targetPlayerId) {
    if (!this.#isAlive(targetPlayerId)) return false;
    const amountStealed = Math.min(this.state.players[targetPlayerId].coins, 2);

    this.state.players[playerId].coins =
      this.state.players[playerId].coins + amountStealed;
    this.state.players[targetPlayerId].coins =
      this.state.players[targetPlayerId].coins - amountStealed;

    return amountStealed;
  }

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

  /**
   * Finaliza o jogo. Limpa o baralho e as cartas dos jogadores.
   * @returns {void}
   */
  stopGame() {
    this.state.isStarted = false;
    this.deck = null;
    this.playerCards = {};
  }

  /**
   * Verifica se um jogador está no jogo atual.
   * @param {string} playerId - ID do jogador
   * @returns {boolean} Retorna `true` se o jogador está no jogo, `false` caso contrário
   */
  isPlayerInGame(playerId) {
    return this.state.players[playerId] !== undefined;
  }
}
