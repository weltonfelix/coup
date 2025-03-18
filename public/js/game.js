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
export class Card {
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
      this.cards.push(new Card('Assassino'));
      this.cards.push(new Card('Condessa'));
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
   * @typedef {object} GameState
   * @property {object.<string, Player>} players - Jogadores do jogo
   * @property {boolean} isStarted - Indica se o jogo está iniciado
   * @property {string} playerInTurn - ID do jogador em turno
   */

  /**
   * Estado do jogo
   * @type {GameState}
   */
  state;

  /**
   * Baralho do jogo
   * @type {Deck}
   */
  deck;

  /**
   * Cartas retiradas do jogo por golpe, assassinato etc.
   * @type {Card[]}
   */
  removedCards;

  /**
   * Cartas dos jogadores
   * @type {object.<string, Card[]>}
   * @example
   * {
   *  'player1': [new Card('Duque'), new Card('Capitão')],
   *  'player2': [new Card('Duque'), new Card('Capitão')],
   * }
   */
  playerCards;

  /**
   * Estado inicial do jogo
   * @type {GameState}
   * @static
   */
  static initialState = {
    players: {},
    isStarted: false,
    playerInTurn: null,
  };

  constructor() {
    this.state = { ...Game.initialState };
    this.deck = null;
    this.playerCards = {};
    this.removedCards = [];
  }

  // ==== GENERAL GAME METHODS ====
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
   * Finaliza o jogo. Limpa o baralho e as cartas dos jogadores.
   * @returns {void}
   */
  stopGame() {
    this.deck = null;
    this.playerCards = {};
    this.removedCards = [];
    this.state = { ...Game.initialState };
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
   * Verifica se um jogador está no jogo atual.
   * @param {string} playerId - ID do jogador
   * @returns {boolean} Retorna `true` se o jogador está no jogo, `false` caso contrário
   */
  isPlayerInGame(playerId) {
    return this.state.players[playerId] !== undefined;
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
   * Jogador perde uma carta por assassinato
   * @param string playerId ID do jogador que está perdendo a carta
   * @param string cardName Nome da carta que será removida
   * @returns {Card|null} Retorna a carta removida, ou null se a carta
   * não foi encontrada
   */
  dropCardMurder(playerId, cardName) {
    if (!this.#isAlive(playerId)) return null;
    const player = this.state.players[playerId];
    const index = this.playerCards[playerId].findIndex(
      (c) => c.name.toLowerCase() === cardName.toLowerCase()
    );

    if (index !== -1) {
      return {
        card: this.playerCards[playerId].splice(index, 1)[0],
        message: `${player.name} foi assassinado e perdeu um ${cardName}`,
        success: true,
      };
    } else {
      return {
        message: `Você não tem essa carta`,
        success: false,
      };
    }
  }

  /**
   * Jogador perde uma carta por golpe.
   * @param string playerId ID do jogador que está perdendo a carta
   * @param string cardName Nome da carta que será removida
   * @returns {Card|null} Retorna a carta removida, ou null se a carta
   * não foi encontrada
   */
  dropCardCoup(playerId, cardName) {
    if (!this.#isAlive(playerId)) return null;
    const player = this.state.players[playerId];
    const index = this.playerCards[playerId].findIndex(
      (c) => c.name.toLowerCase() === cardName.toLowerCase()
    );

    if (index !== -1) {
      return {
        card: this.playerCards[playerId].splice(index, 1)[0],
        message: `${player.name} levou um golpe e perdeu um ${cardName}`,
        success: true,
      };
    } else {
      return {
        message: `Você não tem essa carta`,
        success: false,
      };
    }
  }

  /**
   * Jogador tenta roubar moedas.
   * @param string playerId ID do jogador que está roubando
   * @param string playerId ID do jogador que está sendo roubado
   * @returns {Card|null} Retorna  a mensagem de roubo
   */
  steal(playerId, targetPlayer) {
    
    if (!this.#isAlive(this.getPlayerByName(targetPlayer).id)) {
      return {
      message: `Insira um jogador alvo válido`,
      };
    } else {
    const amountStealed = Math.min(this.state.players[this.getPlayerByName(targetPlayer).id].coins, 2);
    const player = this.state.players[playerId];

    return {
      message: `${player.name} quer roubar ${amountStealed} moedas de ${targetPlayer}`,
    };
  };
  }

  /**
   * Troca uma carta por outra do baralho, REVELANDO a carta retirada.
   * Usada em casos de "desconfio"
   *
   * @param {string} playerId - ID do jogador
   * @param {string} cardName - Nome da carta a ser trocada
   * @returns {object} Retorna um objeto com a mensagem, uma carta nova e um booleano indicando se a troca foi bem sucedida
   */
  exchangeCard(playerId, cardName) {
    if (!this.#isAlive(playerId)) return null;
    const player = this.state.players[playerId];
    const index = this.playerCards[playerId].findIndex(
      (c) => c.name.toLowerCase() === cardName.toLowerCase()
    );

    if (index !== -1) {
      this.deck.add(this.playerCards[playerId][index]);
      this.deck.shuffle();
      const newCard = this.deck.draw();
      this.playerCards[playerId][index] = newCard;
      return {
        message: `${player.name} possuia um ${cardName} e o(a) trocou.`,
        success: true,
        // card: newCard, // Não está passando aqui, pois ele está reenviando diretamente as duas cartas no arquivo principal
      };
    } else {
      return {
        message: `Você não tem essa carta`,
        success: false,
      };
    }
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

  // ==== GAME MECHANICS ====
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
  drawCoins(playerId, amount) {
    this.state.players[playerId].coins += amount;
    if (amount === 1) {
      return {
        message: `${this.state.players[playerId].name} pegou ${amount} moedas como <strong>Renda`,
        success: true,
      }
    } else if (amount === 2) {
      return {
        message: `${this.state.players[playerId].name} pegou ${amount} moedas como <strong>Ajuda Extra`,
        success: true,
      }
    } else if (amount === 3) {
      return {
        message: `${this.state.players[playerId].name} pegou ${amount} moedas como <strong>Imposto (Duque)`,
        success: true,
      }
    } else {
      return {
        message: `${this.state.players[playerId].name} pegou ${amount} moedas`,
        success: true,
      }
    }
    
  }

  /**
   * Remove moedas de um jogador. Paga um valor em moedas.
   * @param {*} playerId - ID do jogador
   * @param {number} amount - Quantidade de moedas a ser paga
   */
  payCoins(playerId, amount) {
    const player = this.state.players[playerId];
    if (player.coins < amount) {
      return {
        message: `Você tem apenas ${player.coins} moedas`,
        success: false,
      }
    }
    player.coins -= amount;
    return {
      message: `${player.name} pagou ${amount} moedas`,
      success: true,
    }
  }
}
