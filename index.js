import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { Game } from './public/js/game.js';
import { CommandHandler } from './src/commandHandler.js';
import { GameActionHandler } from './src/gameActionHandler.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static('public'));

const game = new Game();
const commandHandler = new CommandHandler(game, io);
const gameActionHandler = new GameActionHandler(game);

function nextTurn() {
  game.nextTurn();
  io.emit('updateGame', game.state);
  io.emit('messageReceived', {
    player: { name: 'JOGO' },
    message: `É a vez de ${game.state.players[game.state.playerInTurn].name}.`,
  });
}

io.on('connection', (socket) => {
  const player = {
    id: socket.id,
    name: socket.handshake.auth.name,
    coins: 0,
  };
  const formattedPlayer = `${player.name} - ${player.id}`;
  console.log(`Player connected: ${player.name} - ${player.id}`);
  game.addPlayer(player);
  io.emit('updateGame', game.state);

  socket.on('sendMessage', (message) => {
    console.log(`Player ${formattedPlayer} sent: ${message}`);
    socket.broadcast.emit('messageReceived', { player, message });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${formattedPlayer}`);
    game.removePlayer(player.id);
    if (game.state.players.length === 0) {
      game.stopGame();
    }
    socket.broadcast.emit('updateGame', game.state);
  });

  socket.on('startGame', () => {
    if (game.state.isStarted) {
      return; // Game already started
    }
    const playersOrderNames = commandHandler.startGame(io.sockets.sockets);
    console.log(`----- GAME STARTED (by ${formattedPlayer}) -----`);
    io.emit('updateGame', game.state); // Update game state for all players, since the game has started
    io.emit('messageReceived', {
      player: { name: 'JOGO' },
      message: `O jogo começou!<br/> A ordem dos jogadores é: ${playersOrderNames.join(
        ' → '
      )}`,
    });
    io.emit('messageReceived', {
      player: { name: 'JOGO' },
      message: `É a vez de ${
        game.state.players[game.state.playerInTurn].name
      }.`,
    });
  });

  socket.on('stopGame', () => {
    commandHandler.stopGame();
    console.log(`----- GAME STOPPED (by ${formattedPlayer}) -----`);
    io.emit('updateGame', game.state);
  });

  socket.on('gameAction', ({ action }) => {
    if (player.id !== game.state.playerInTurn) {
      return io.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: `Não é a sua vez, ${player.name}.`,
      });
    }

    let message = '';

    switch (action) {
      case 'income':
        message = gameActionHandler.income(player);
        break;
      case 'foreignAid':
        message = gameActionHandler.foreignAid(player);
        break;
      default:
        console.error(`Invalid action: ${action} by ${formattedPlayer}`);
        return io.emit('messageReceived', {
          player: { name: 'JOGO' },
          message: `Ação inválida: ${action}`,
        });
    }

    console.log(`Player ${formattedPlayer} performed action: ${action}`);
    io.emit('messageReceived', {
      player: { name: 'JOGO' },
      message,
    });
    nextTurn();

    io.emit('updateGame', game.state);
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
