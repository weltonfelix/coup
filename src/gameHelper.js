export class GameHelper {
  #game;
  #player;
  #formattedPlayer;
  #io;
  #socket;
  #m; // Message helper

  constructor(game, player, formattedPlayer, io, socket, messageHelper) {
    if (!game) {
      throw new Error('Game instance is required');
    }
    if (!player) {
      throw new Error('Player object is required');
    }
    if (!formattedPlayer) {
      throw new Error('Formatted player name is required');
    }
    if (!io) {
      throw new Error('Socket.io instance is required');
    }
    if (!socket) {
      throw new Error('Socket instance is required');
    }
    if (!messageHelper) {
      throw new Error('MessageHelper instance is required');
    }

    this.#game = game;
    this.#player = player;
    this.#formattedPlayer = formattedPlayer;
    this.#io = io;
    this.#socket = socket;
    this.#m = messageHelper;
  }

  checkPlayerInGame() {
    if (!this.#game.isPlayerInGame(this.#player.id)) {
      console.log(`Player ${this.#formattedPlayer} not in game`);
      this.#socket.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: 'Você não está no jogo! Espere o próximo jogo começar.',
      });
      return false;
    }
    return true;
  }

  /**
   * Verifica se o jogador perdeu o jogo
   * @returns {boolean} Retorna `true` se o jogador perdeu, `false` caso contrário
   */
  checkLose() {
    if (this.#game.playerCards[this.#player.id].length === 0) {
      console.log(`Player ${this.#formattedPlayer} lost`);
      this.#io.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: `${this.#player.name} perdeu!`,
      });
      this.#socket.broadcast.emit('updateGame', this.#game.state);
      return true;
    }
  }

  resetGame() {
    this.#game.stopGame();
    console.log('Adding spectators to the next game');
    for (const [id, socket] of this.#io.sockets.sockets) {
      console.log(`Checking socket ${id}`);
      const playerName = socket.handshake.auth.name;
      console.log(`Player name: ${playerName}`);
      if (!this.#game.getPlayerByName(playerName)) {
        // Criar um novo jogador para o próximo jogo
        const newPlayer = {
          id,
          name: playerName,
          coins: 0,
        };
        this.#game.addPlayer(newPlayer);
      }
    }
    this.#io.emit('updateGame', this.#game.state);
  }

  checkGameWon() {
    return (
      Object.values(this.#game.state.players).filter(
        (p) => this.#game.playerCards[p.id].length > 0
      ).length === 1
    );
  }

  handleGameWon() {
    const winner = Object.values(this.#game.state.players).find(
      (p) => this.#game.playerCards[p.id].length > 0
    );
    console.log(`Player ${winner.name} won the game`);
    this.#io.emit('messageReceived', {
      player: { name: 'JOGO' },
      message: `${winner.name} venceu o jogo!`,
    });
    this.#game.stopGame();
    this.#io.emit('updateGame', this.#game.state);
    this.resetGame();
  }
}
