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

export const TurnTypes = Object.freeze({
    REGULAR:   Symbol("regular"),
    DROP_CARD:  Symbol("drop_card"),
    STEAL: Symbol("steal")
});

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
   * @property {string} turnType - Tipo de turno (regular, dropCard, steal)
   */
  state = {
    players: {},
    isStarted: false,
    playerInTurn: null,
    turnType: TurnTypes.REGULAR,
    steal: false,
    // {
    //   //  playerId: null,
    //   // targetPlayerId: null,
    //   // amount: 0
    // }
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
      turnType: TurnTypes.REGULAR,
      steal: false,
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
   * Tenta aceitar o roubo de moedas de um jogador. Ou seja, o jogador aceita perder moedas.
   * @param {string} playerId - ID do jogador que está tentando roubar
   * @returns {number|boolean} Retorna a quantidade de moedas roubadas, ou `false` se o jogador alvo não está mais no jogo
   */
  accept_steal(playerId) {
    const targetPlayerId = this.state.steal.targetPlayerId;
    
    if (playerId === targetPlayerId) return false;  // Não pode roubar a si mesmo
    if (!this.#isAlive(targetPlayerId)) return false;  // Verifica se a vítima ainda está no jogo

    const amountStealed = Math.min(this.state.players[targetPlayerId].coins, 2);  // Rouba no máximo 2 moedas

    this.state.players[playerId].coins += amountStealed;  // O jogador que roubou recebe as moedas
    this.state.players[targetPlayerId].coins -= amountStealed;  // A vítima perde as moedas

    this.state.turnType = TurnTypes.REGULAR;  // O turno volta a ser normal após o roubo
    this.state.playerInTurn = playerId;  // O turno volta para quem roubou

    this.state.steal = false;  // O roubo é concluído

    return amountStealed;  // Retorna a quantidade de moedas roubadas
  }

  /**
   * Tenta bloquear um roubo. Ou seja, impede que o roubo aconteça e o turno não é alterado.
   * @param {string} playerId - ID do jogador que está bloqueando o roubo
   * @returns {boolean} Retorna `true` se o bloqueio for bem-sucedido, ou `false` se não houver um roubo ativo
   */
  block_steal(playerId) {
    const targetPlayerId = this.state.steal.targetPlayerId;

    if (!this.state.steal || !this.#isAlive(targetPlayerId)) return false;  // Verifica se há um roubo ativo e se a vítima está viva

    // Impede que o roubo aconteça, mas não altera as moedas
    this.state.steal = false;  // O roubo é cancelado

    // Não altera o turno - quem estava tentando roubar mantém o turno
    this.state.turnType = TurnTypes.REGULAR;
    this.state.playerInTurn = this.state.steal.playerId;

    return true;  // Bloqueio bem-sucedido
  }

  /**
   * Tentativa de roubo. Este método prepara o roubo de moedas de um jogador.
   * @param {string} playerId - ID do jogador que está tentando roubar
   * @param {string} targetPlayerId - ID do jogador que está sendo roubado
   * @returns {boolean} Retorna `true` se o roubo foi iniciado com sucesso, ou `false` se não for possível
   */
  stealAttempt(playerId, targetPlayerId) {
    if (playerId === targetPlayerId) return false;  // Não pode roubar a si mesmo
    if (!this.#isAlive(targetPlayerId)) return false;  // Verifica se a vítima está viva

    const amount = Math.min(this.state.players[targetPlayerId].coins, 2);  // Define o valor do roubo

    this.state.turnType = TurnTypes.STEAL;  // O turno agora é de roubo
    this.state.playerInTurn = playerId;  // O turno vai para a vítima, pois ela tem a chance de bloquear ou aceitar

    this.state.steal = {
      playerId,
      targetPlayerId,
      amount,
    };

    return true;  // Roubo iniciado com sucesso
  }


  /**
   * Realiza um assassinato. O jogador paga 3 moedas e o alvo deve descartar uma carta.
   * @param {string} playerId - ID do jogador que está realizando o assassinato
   * @param {string} targetPlayerId - ID do jogador alvo
   * @returns {boolean} Retorna `true` se o assassinato foi bem-sucedido, `false` caso contrário
   */
  assassin(playerId, targetPlayerId) {
    if (playerId === targetPlayerId) {
      return false;
    }

    if (this.state.players[playerId].coins < 3) {
      return false;
    }

    if (!this.#isAlive(targetPlayerId)) {
      return false;
    }

    this.state.players[playerId].coins -= 3;
    this.state.playerInTurn = targetPlayerId; 
    

    return true;
  }

  /**
   * Remove uma carta do jogador
   * @param string playerId ID do jogador que está perdendo a carta
   * @param string cardName Nome da carta que será removida
   * @returns {Card|null} Retorna a carta removida, ou null se a carta
   * não foi encontrada
   */
  #dropCard(playerId, cardName) {
    if (!this.#isAlive(playerId)) return null;
    const index = this.playerCards[playerId].findIndex(
      (c) => c.name.toLowerCase() === cardName.toLowerCase()
    );

    if (index !== -1) {
      return this.playerCards[playerId].splice(index, 1)[0];
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
    if (playerId === targetPlayerId) {
      return {
        ok: false,
        failMessage: 'Você não pode realizar um golpe de estado em si mesmo.',
      };
    }
    if (this.state.players[playerId].coins < 7) {
      return {
        ok: false,
        failMessage:
          'Você não tem moedas suficientes para realizar um golpe de estado.',
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
    const card = this.#dropCard(playerId, cardName);
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
    this.coupedCards = [];
    this.state.players = {};
    this.state.playerInTurn = null;
    this.state.turnType = TurnTypes.REGULAR;
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
