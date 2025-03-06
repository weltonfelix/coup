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

function resetGame() {
  game.state = {
    players: {},
    isStarted: false,
    playerInTurn: null,
    dropCardTurn: false,
  }
  game.deck = null;
  console.log('Adding spectators to the next game');
  for (const [id, socket] of io.sockets.sockets) {
    console.log(`Checking socket ${id}`);
    const playerName = socket.handshake.auth.name;
    console.log(`Player name: ${playerName}`);
    if (!game.getPlayerByName(playerName)) {
      // Criar um novo jogador para o próximo jogo
      const newPlayer = {
        id,
        name: playerName,
        coins: 0,
      };
      game.addPlayer(newPlayer);
    }
  }
  io.emit('updateGame', game.state);
}

function checkGameWon() {
  return (
    Object.values(game.state.players).filter(
      (p) => game.playerCards[p.id].length > 0
    ).length === 1
  );
}

function handleGameWon() {
  const winner = Object.values(game.state.players).find(
    (p) => game.playerCards[p.id].length > 0
  );
  console.log(`Player ${winner.name} won the game`);
  io.emit('messageReceived', {
    player: { name: 'JOGO' },
    message: `${winner.name} venceu o jogo!`,
  });
  game.stopGame();
  io.emit('updateGame', game.state);
  resetGame();
}

io.on('connection', (socket) => {
  console.log(
    `${socket.id} trying to connect using name: ${socket.handshake.auth.name}`
  );
  if (!socket.handshake.auth.name.trim()) {
    console.log('Player disconnected: No name provided');
    socket.emit('messageReceived', {
      player: { name: 'JOGO' },
      message:
        'Nome de jogador não fornecido. Recarregue a página e tente novamente.',
    });
    return socket.disconnect();
  }

  if (game.getPlayerByName(socket.handshake.auth.name) || socket.handshake.auth.name === 'JOGO') {
    // Se o jogador já estiver no jogo, ou se o nome for "JOGO", desconectar
    // "JOGO" é o nome reservado para o sistema de mensagens
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
    socket.emit('messageReceived', {
      player: { name: 'JOGO' },
      message:
        'O jogo já começou. Você pode assistir, mas não pode participar.',
    });
  }

  function checkPlayerInGame() {
    if (!game.isPlayerInGame(player.id)) {
      console.log(`Player ${formattedPlayer} not in game`);
      socket.emit('messageReceived', {
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
  function checkLose() {
    if (game.playerCards[player.id].length === 0) {
      console.log(`Player ${formattedPlayer} lost`);
      io.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: `${player.name} perdeu!`,
      });
      socket.broadcast.emit('updateGame', game.state);
      return true;
    }
  }

  socket.on('sendMessage', (message, callback) => {
    console.log(`Player ${formattedPlayer} sent: ${message}`);
    sendMessageToOthers(socket, { player, message });
    callback(); // Essa função é chamada para confirmar ao cliente que a mensagem foi recebida
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${formattedPlayer}`);
    game.removePlayer(player.id);
    if (Object.keys(game.state.players).length === 0) {
      game.stopGame();
      messages = [];
    }
    socket.broadcast.emit('updateGame', game.state);
  });

  socket.on('startGame', () => {
    if (game.state.isStarted) {
      return; // Game already started
    }
    if (!checkPlayerInGame()) return;
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
    if (!checkPlayerInGame()) return;
    commandHandler.stopGame();
    console.log(`----- GAME STOPPED (by ${formattedPlayer}) -----`);
    io.emit('updateGame', game.state);

    resetGame();

    sendMessageToAll({
      player: { name: 'JOGO' },
      message: 'O jogo foi encerrado.',
    });
  });

  socket.on('gameAction', ({ action, param }) => {
    if (!checkPlayerInGame()) return;
    if (player.id !== game.state.playerInTurn) {
      return socket.emit({
        player: { name: 'JOGO' },
        message: `Não é a sua vez, ${player.name}.`,
      });
    }

    let message = '';

    if (game.state.dropCardTurn) {
      if (action !== 'coupDrop') {
        return socket.emit('messageReceived', {
          player: { name: 'JOGO' },
          message: `Você precisa descartar uma carta, ${player.name}.`,
        });
      }
    }

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
          targetId: coupTargetId,
        } = gameActionHandler.coupAttempt(player, param);
        message = coupMessage;
        if (!proceed) {
          sendMessageToAll({
            player: { name: 'JOGO' },
            message,
          });
          return sendMessageToAll({
            player: { name: 'JOGO' },
            message: `Realize outra ação, ${player.name}.`,
          });
        } else {
          auxPlayerInTurn = game.state.playerInTurn;
          game.state.playerInTurn = coupTargetId;
          game.state.dropCardTurn = true;
          io.emit('updateGame', game.state);
          sendMessageToAll({
            player: { name: 'JOGO' },
            message: `${player.name} deu um golpe em ${game.state.players[coupTargetId].name}!`,
          });
          return sendMessageToAll({
            player: { name: 'JOGO' },
            message: `${game.state.players[coupTargetId].name}, escolha uma carta para perder.`,
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
          game.state.playerInTurn = auxPlayerInTurn;
          game.state.dropCardTurn = false;
          auxPlayerInTurn = null; 
          io.emit('updateGame', game.state);
          sendMessageToAll({
            player: { name: 'JOGO' },
            message: `${player.name} descartou uma carta. O turno volta para ${game.state.players[game.state.playerInTurn].name}.`,
          });
          break;
          case 'assassin':
            const { message: assassinMessage, success, targetId } = gameActionHandler.assassin(player, param);
            message = assassinMessage;
            if (!success) {
              sendMessageToAll({
                player: { name: 'JOGO' },
                message,
              });
              return;
            } else {
              auxPlayerInTurn = game.state.playerInTurn;
              game.state.playerInTurn = targetId;
              game.state.dropCardTurn = true;
              io.emit('updateGame', game.state);
              sendMessageToAll({
                player: { name: 'JOGO' },
                message: `${player.name} tentou assassinar ${param}! ${param} deve descartar uma carta ou usar a Condessa.`,
              });
              return;
            }
            break;

        case 'condessa':
          const { message: condessaMessage, success: condessaSuccess } = gameActionHandler.condessa(player);
          message = condessaMessage;
          if (condessaSuccess) {
            game.state.dropCardTurn = false;
            game.state.playerInTurn = auxPlayerInTurn;
            auxPlayerInTurn = null; 
            io.emit('updateGame', game.state); 
            sendMessageToAll({
              player: { name: 'JOGO' },
              message: `${player.name} usou a Condessa para bloquear o assassinato! O turno volta para ${game.state.players[game.state.playerInTurn].name}.`,
            });
          } else {
            game.state.dropCardTurn = true; 
            sendMessageToAll({
              player: { name: 'JOGO' },
              message: `${player.name} não tem a Condessa e deve descartar uma carta.`,
            });
          }
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

    if (checkLose()) {
      if (checkGameWon()) {
        handleGameWon();
        return;
      }
    }
    nextTurn();

    io.emit('updateGame', game.state);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Server is running on port ' + port);
});
