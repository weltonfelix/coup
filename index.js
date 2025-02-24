import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { Game } from './public/js/game.js';
import { CommandHandler } from './src/commandHandler.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static('public'));

const game = new Game();
const commandHandler = new CommandHandler(game, io);

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
    const playersOrderNames = commandHandler.startGame(io.sockets.sockets);
    io.emit('updateGame', game.state); // Update game state for all players, since the game has started
    io.emit('messageReceived', {
      player: { name: 'JOGO' },
      message: `O jogo começou!<br/> A ordem dos jogadores é: ${playersOrderNames.join(' → ')}`,
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
    io.emit('updateGame', game.state);
  });

  socket.on('playAction', ({action}) => {
    //TODO: implement game logic    
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
