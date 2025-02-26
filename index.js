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
let messages = [];
/**
 * This variable is used to store the actual player in turn when a coup is attempted
 */
let auxPlayerInTurn = '';

function sendMessageToAll(message) {
  io.emit('messageReceived', message);
  messages.push(message);
}

function sendMessageToOthers(socket, message) {
  socket.broadcast.emit('messageReceived', message);
  messages.push(message);
}

function nextTurn() {
  game.nextTurn();
  io.emit('updateGame', game.state);
  sendMessageToAll({
    player: { name: 'JOGO' },
    message: `É a vez de ${game.state.players[game.state.playerInTurn].name}.`,
  });
}

io.on('connection', (socket) => {
  console.log(
    `${socket.id} trying to connect using name: ${socket.handshake.auth.name}`
  );
  if (!socket.handshake.auth.name) {
    console.log('Player disconnected: No name provided');
    socket.emit('messageReceived', {
      player: { name: 'JOGO' },
      message:
        'Nome de jogador não fornecido. Recarregue a página e tente novamente.',
    });
    return socket.disconnect();
  }

  if (game.getPlayerByName(socket.handshake.auth.name)) {
    console.log('Player disconnected: Name already in use');
    socket.emit('messageReceived', {
      player: { name: 'JOGO' },
      message:
        'Nome de jogador já em uso. Recarregue a página e tente novamente.',
    });
    return socket.disconnect();
  }

  const player = {
    id: socket.id,
    name: socket.handshake.auth.name,
    coins: 0,
  };
  const formattedPlayer = `${player.name} - ${player.id}`;
  console.log(`Player connected: ${player.name} - ${player.id}`);

  for (const message of messages) {
    socket.emit('messageReceived', message);
  }

  if (!game.state.isStarted) {
    game.addPlayer(player);
    io.emit('updateGame', game.state);
    sendMessageToAll({
      player: { name: 'JOGO' },
      message: `${player.name} entrou no jogo!`,
    });
  } else {
    sendMessageToAll({
      player: { name: 'JOGO' },
      message: `${player.name} entrou como espectador`,
    });
  }

  socket.on('sendMessage', (message, callback) => {
    console.log(`Player ${formattedPlayer} sent: ${message}`);
    sendMessageToOthers(socket, { player, message });
    callback(); // Essa função é chamada para confirmar ao cliente que a mensagem foi recebida
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${formattedPlayer}`);
    game.removePlayer(player.id);
    if (game.state.players.length === 0) {
      game.stopGame();
      messages = [];
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
    sendMessageToAll({
      player: { name: 'JOGO' },
      message: `O jogo começou!<br/> A ordem dos jogadores é: ${playersOrderNames.join(
        ' → '
      )}`,
    });
    sendMessageToAll({
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

  socket.on('gameAction', ({ action, param }) => {
    if (player.id !== game.state.playerInTurn) {
      return sendMessageToAll({
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
      case 'steal':
        message = gameActionHandler.steal(player, param);
        break;
      case 'tax':
        message = gameActionHandler.tax(player);
        break;
      case 'coup':
        const {
          message: coupMessage,
          proceed,
          targetId,
        } = gameActionHandler.coupAttempt(player, param);
        message = coupMessage;
        if (!proceed) {
          // Não foi possível realizar o golpe, tentar novamente
          sendMessageToAll({
            player: { name: 'JOGO' },
            message,
          });
          return sendMessageToAll({
            player: { name: 'JOGO' },
            message: `Realize outra ação, ${player.name}.`,
          });
        } else {
          // se o golpe foi bem sucedido, o jogador que levou o golpe perde uma carta. Precisa decidir qual.
          auxPlayerInTurn = game.state.playerInTurn;
          game.state.playerInTurn = targetId;
          io.emit('updateGame', game.state);
          sendMessageToAll({
            player: { name: 'JOGO' },
            message: `${player.name} deu um golpe em ${game.state.players[targetId].name}!`,
          });
          return sendMessageToAll({
            player: { name: 'JOGO' },
            message: `${game.state.players[targetId].name}, escolha uma carta para perder.`,
          });
        }
        break;
      case 'coupDrop':
        message = gameActionHandler.coup(player, param);
        if (!message) {
          return sendMessageToAll({
            player: { name: 'JOGO' },
            message: `Carta inválida, ${player.name}. Descarte uma carta.`,
          });
        }
        io.emit('updateGame', game.state);
        game.state.playerInTurn = auxPlayerInTurn;
        auxPlayerInTurn = null;
        break;
      default:
        console.error(`Invalid action: ${action} by ${formattedPlayer}`);
        return sendMessageToAll({
          player: { name: 'JOGO' },
          message: `Ação inválida: ${action}`,
        });
    }

    console.log(`Player ${formattedPlayer} performed action: ${action}`);
    sendMessageToAll({
      player: { name: 'JOGO' },
      message,
    });
    nextTurn();

    io.emit('updateGame', game.state);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Server is running on port ' + port);
});
