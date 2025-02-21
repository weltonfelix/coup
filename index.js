import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { Game } from './public/js/game.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static('public'));

const game = new Game();

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
      return;
    }
    console.log('----- GAME STARTED -----');
    game.startGame();

    for (const playerId of Object.keys(game.state.players)) {
      const playerSocket = io.sockets.sockets.get(playerId);
      if (!playerSocket) {
        console.error(`Player ${playerId} not found`);
        continue;
      }
      playerSocket.emit('gameStarted', {
        cards: game.playerCards[playerId],
      });
    }
    io.emit('updateGame', game.state);
    const playerInTurn = game.state.playerInTurn;
    const playersOrder = [playerInTurn];
    game.nextTurn();
    while (game.state.playerInTurn !== playerInTurn) {
      playersOrder.push(game.state.playerInTurn);
      game.nextTurn();
    }
    const playersOrderNames = playersOrder.map(
      (playerId) => game.state.players[playerId].name
    );

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
    console.log('----- GAME STOPPED -----');
    game.stopGame();
    io.emit('updateGame', game.state);
  });

  socket.on('playAction', ({action}) => {
    //TODO: implement game logic    
  });
});

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});
