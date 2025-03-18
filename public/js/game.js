/**
 * @typedef {object} Player
 * @property {string} id - ID do jogador
 * @property {string} name - Nome do jogador
 * @property {number} coins - Quantidade de moedas do jogador
 */

import { CaptainActions } from './cards/captain.js';
import { DukeActions } from './cards/duke.js';
import { AssassinActions } from './cards/assassin.js';
import { CoupActions } from './coup.js';
import { ContessaActions } from './cards/contessa.js';

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

export const TurnTypes = Object.freeze({
  REGULAR: 'regular',
  DROP_CARD: 'drop_card',
  STEAL: 'steal',
  ASSASSIN: 'assassin',
});

/**
 * Jogo
 * @class
 */
export class Game {
  /**
   * @typedef {object} StealEvent - Informações sobre um roubo em andamento (Capitão)
   * @property {string} playerId - ID do jogador que está tentando roubar
   * @property {string} targetPlayerId - ID do jogador que está sendo roubado
   * @property {number} amount - Quantidade de moedas a ser roubada
   *
   * @typedef {object} GameEvents - Eventos do jogo
   * @property {StealEvent} steal - Informações sobre o roubo, `null` se não houver roubo acontecendo no momento
   *
   * @typedef {object} GameState
   * @property {object.<string, Player>} players - Jogadores do jogo
   * @property {boolean} isStarted - Indica se o jogo está iniciado
   * @property {string} playerInTurn - ID do jogador em turno
   * @property {string} playerTempInTurn - ID do jogador temporariamente em turno, usado quando ação de um jogador
   *                                       requer ação de outro (ex: roubo, assassinato etc.)
   * @property {string} turnType - Tipo de turno (regular, dropCard, steal)]
   * @property {GameEvents} gameEvents - Informações sobre os eventos em andamento no jogo (roubo, golpe, etc.)
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
    playerTempInTurn: null,
    turnType: TurnTypes.REGULAR,
    gameEvents: {
      steal: null,
    },
  };

  #captainActions;
  #dukeActions;
  #assassinActions;
  #contessaActions;
  #coupActions;

  constructor() {
    this.state = { ...Game.initialState };
    console.log(this.state);
    this.deck = null;
    this.playerCards = {};
    this.removedCards = [];

    this.#captainActions = new CaptainActions(this);
    this.#dukeActions = new DukeActions(this);
    this.#assassinActions = new AssassinActions(this);
    this.#contessaActions = new ContessaActions(this);
    this.#coupActions = new CoupActions(this);
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
      this.state.players[playerId].coins = 8; // FIXME: voltar pra 2
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
   * Passa o turno para o próximo jogador, de acordo com a ordem dos jogadores.
   * @returns {void}
   */
  nextTurn() {
    const players = Object.keys(this.state.players);

    const currentPlayerIndex = players.indexOf(this.state.playerInTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;

    this.state.playerInTurn = players[nextPlayerIndex];
    while (!this.#isAlive(this.state.playerInTurn)) {
      // Skip dead players
      this.nextTurn();
    }
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
      return this.playerCards[playerId].splice(index, 1)[0];
    } else {
      return null;
    }
  }

  swapCards(playerId) {
    if (!this.#isAlive(playerId)) return;
  
    // Verifica quantas cartas o jogador tem atualmente
    const currentCards = this.playerCards[playerId];
    const numberOfCards = currentCards.length;
  
    // Devolve as cartas atuais do jogador ao baralho
    currentCards.forEach(card => this.deck.add(card));
  
    // Embaralha o baralho
    this.deck.shuffle();
  
    // Distribui novas cartas ao jogador, mantendo a mesma quantidade que ele tinha antes
    this.playerCards[playerId] = [];
    for (let i = 0; i < numberOfCards; i++) {
      this.playerCards[playerId].push(this.deck.draw());
    }
  }

  /**
   * Passa o turno para um jogador temporariamente, para que ele possa realizar uma ação.
   * @param {string} playerId - ID do jogador
   * @param {TurnTypes} turnType - Tipo de turno
   * @returns {void}
   */
  yieldTurn(playerId, turnType) {
    this.state.playerTempInTurn = playerId;
    this.state.turnType = turnType;
  }

  /**
   * Retorna o turno para o jogador que estava em turno antes de uma ação temporária.
   */
  returnTurn() {
    this.state.playerTempInTurn = null;
    this.state.turnType = TurnTypes.REGULAR;
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
  #drawCoins(playerId, amount) {
    this.state.players[playerId].coins += amount;
  }

  // ==== GAME ACTIONS ====
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
    //TODO: implementar bloqueio
    this.#drawCoins(playerId, 2);
  }

  /**
   * Realiza um golpe de estado.
   *
   * @param {string} playerId - ID do jogador que está tentando realizar o golpe
   * @param {string} targetPlayerId - ID do jogador que está sendo atacado
   * @returns {object} - Retorna um objeto com a propriedade `ok` indicando se o golpe pode ser realizado.
   * Se `ok` for `false`, a propriedade `failMessage` conterá uma mensagem indicando o motivo do golpe não poder ser realizado.
   */
  coup(playerId, targetPlayerId) {
    if (!this.#isAlive(targetPlayerId)) {
      return {
        ok: false,
        failMessage: 'O jogador alvo não está mais no jogo.',
      };
    }
    return this.#coupActions.coup(playerId, targetPlayerId);
  }

  /**
   * Perde uma carta devido a um golpe de estado sofrido.
   *
   * @param {string} playerId - ID do jogador que sofreu o golpe
   * @param {string} cardName - Nome da carta que será perdida
   * @returns {Card|null} - Retorna a carta removida, ou null se o golpe não pôde ser realizado.
   */
  coupCardDrop(playerId, cardName) {
    return this.#coupActions.coupDrop(playerId, cardName);
  }

  // ==== CARD ACTIONS ====
  // ==== DUQUE ====
  /**
   * DUQUE
   * Cobra imposto. Isto é, dá 3 moedas para o jogador. Ação do Duque.
   * @param {string} playerId - ID do jogador
   * @returns {void}
   */
  tax(playerId) {
    this.#drawCoins(playerId, this.#dukeActions.tax(playerId));
  }

  // ==== CAPITÃO ====
  /**
   * CAPITÃO
   * Tentativa de roubo. Este método prepara o roubo de moedas de um jogador.
   * @param {string} playerId - ID do jogador que está tentando roubar
   * @param {string} targetPlayerId - ID do jogador que está sendo roubado
   * @returns {boolean} Retorna `true` se o roubo foi iniciado com sucesso, ou `false` se não for possível
   */
  stealAttempt(playerId, targetPlayerId) {
    if (playerId === targetPlayerId) return false; // Não pode roubar a si mesmo
    if (!this.#isAlive(targetPlayerId)) return false; // Verifica se a vítima está viva

    this.#captainActions.stealAttempt(playerId, targetPlayerId);
  }

  /**
   * CAPITÃO
   * Aceita o roubo de moedas sofrido. Ou seja, o jogador aceita perder moedas.
   * @returns {number|boolean} Retorna a quantidade de moedas roubadas, ou `false` se o jogador alvo não está mais no jogo
   */
  accept_steal() {
    //TODO: fix naming
    this.#captainActions.acceptSteal();
  }

  /**
   * CAPITÃO
   * Tenta bloquear um roubo. Ou seja, impede que o roubo aconteça e o turno não é alterado.
   * @returns {boolean} Retorna `true` se o bloqueio for bem-sucedido, ou `false` se não houver um roubo ativo
   */
  block_steal() {
    //TODO: fix naming
    const targetPlayerId = this.state.steal.targetPlayerId;
    if (!this.state.steal || !this.#isAlive(targetPlayerId)) return false; // Verifica se há um roubo ativo e se a vítima está viva

    this.#captainActions.blockSteal();
  }

  // ==== ASSASSINO ====
  /**
   * ASSASSINO
   * Tenta realizar um assassinato.
   * @param {string} playerId - ID do jogador que está realizando o assassinato
   * @param {string} targetPlayerId - ID do jogador alvo
   * @returns {object} Retorna um objeto com message e success `true` se a tentativa pode seguir, `false` caso contrário
   */
  assassinAttempt(playerId, targetPlayerId) {
    if (!this.#isAlive(targetPlayerId)) return {
      message: 'Jogador alvo não está no jogo.',
      success: false
    };
    return this.#assassinActions.killAttempt(playerId, targetPlayerId);
  }

  /**
   * ASSASSINO
   * Realiza um assassinato. O jogador paga 3 moedas e o alvo deve descartar uma carta.
   * @param {string} playerId - ID do jogador que está realizando o assassinato
   * @param {string} targetPlayerId - ID do jogador alvo
   * @returns {boolean} Retorna `true` se o assassinato foi bem-sucedido, `false` caso contrário
   */
  assassin(playerId, targetPlayerId) {
    if (!this.#isAlive(targetPlayerId)) return false;
    return this.#assassinActions.kill(playerId, targetPlayerId);
  }

  /**
   * Perde uma carta devido a um assassinato sofrido.
   *
   * @param {string} playerId - ID do jogador que sofreu o assassinato.
   * @param {string} cardName - Nome da carta que será perdida
   * @returns {object} Retorna um objeto com a propriedade `message` e `success`, indicando se a ação foi bem sucedida.
   */
  assassinCardDrop(playerId, cardName) {
    return this.#assassinActions.assassinCardDrop(playerId, cardName);
  }

  // ==== CONDESSA ====
  /**
   * CONDESSA
   * Tenta realizar uma defesa contra um assassinato.
   * @param {string} contessaId ID do jogador que está tentando se defender
   * @returns {object} Retorna um objeto com a propriedade `message` indicando a mensagem a ser exibida
   * e a propriedade `success` indicando se a defesa foi bem sucedida.
   */
  defenseAttempt(contessaId) {
    return this.#contessaActions.defenseAttempt(contessaId);
  }

  /**
   * CONDESSA
   * Realiza a defesa com a Condessa.
   * @returns {boolean} Se a defesa foi bem sucedida
   */
  defense() {
    return this.#contessaActions.defense();
  }

  /**
   * Descarta uma carta de um jogador.
   * @param {string} playerId - ID do jogador
   * @param {string} cardName - Nome da carta a ser descartada
   * @returns {Card|null} Retorna a carta descartada, ou null se a carta não foi encontrada
   */
  discardCard(playerId, cardName) {
    if (!this.#isAlive(playerId)) return null;

    const index = this.playerCards[playerId].findIndex(
      (c) => c.name.toLowerCase() === cardName.toLowerCase()
    );

    if (index !== -1) {
      const discardedCard = this.playerCards[playerId].splice(index, 1)[0];
      this.removedCards.push(discardedCard); // Adiciona a carta descartada ao baralho de cartas removidas
      return discardedCard;
    } else {
      return null;
    }
  }
}
