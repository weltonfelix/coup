import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { Game, TurnTypes } from './public/js/game.js';
import { CommandHandler } from './src/commandHandler.js';
import { GameActionHandler } from './src/gameActionHandler.js';
import { MessageHelper } from './src/messageHelper.js';
import { GameHelper } from './src/gameHelper.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static('public'));

const game = new Game();
const commandHandler = new CommandHandler(game, io);
const gameActionHandler = new GameActionHandler(game);
let messages = [];

// Message Helper (m)
const m = new MessageHelper(io, messages);

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

  if (
    game.getPlayerByName(socket.handshake.auth.name) ||
    socket.handshake.auth.name === 'JOGO'
  ) {
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

  // Game Helper (g)
  const g = new GameHelper(game, player, formattedPlayer, io, socket, m);

  if (!game.state.isStarted) {
    game.addPlayer(player);
    io.emit('updateGame', game.state);
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: `${player.name} entrou no jogo!`,
    });
  } else {
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: `${player.name} entrou como espectador`,
    });
    socket.emit('messageReceived', {
      player: { name: 'JOGO' },
      message:
        'O jogo já começou. Você pode assistir, mas não pode participar.',
    });
  }

  socket.on('sendMessage', (message, callback) => {
    console.log(`Player ${formattedPlayer} sent: ${message}`);
    m.sendMessageToOthers(socket, { player, message });
    callback(); // Essa função é chamada para confirmar ao cliente que a mensagem foi recebida
  });

  socket.on('attemptAction', ({ action, param }) => {
    const player = game.state.players[socket.id];
    if (!player) return;

    let message = `${player.name} está tentando realizar a ação: ${action}`;
    if (param) {
      message += ` em ${param}`;
    }

    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: message,
    });
  });

  socket.on('cancelAction', () => {
    const player = game.state.players[socket.id];
    if (!player) {
      return socket.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: 'Você não está no jogo!',
      });
    }
  
    // Verifica se é a vez do jogador
    const isRegularTurn = game.state.turnType === TurnTypes.REGULAR;
    if (
      (!isRegularTurn && player.id !== game.state.playerTempInTurn) ||
      (isRegularTurn && player.id !== game.state.playerInTurn)
    ) {
      return socket.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: `Não é a sua vez, ${player.name}.`,
      });
    }
  
    // Cancela a ação pendente e passa o turno para o próximo jogador
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: `${player.name} cancelou a ação. O turno passará para o próximo jogador.`,
    });
  
    g.nextTurn(); // Passa o turno para o próximo jogador
  });

  socket.on('doubtAction', ({ target }) => {
    const player = game.state.players[socket.id];
    const targetPlayer = game.getPlayerByName(target);

    if (!player || !targetPlayer) {
      return socket.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: 'Jogador alvo não encontrado.',
      });
    }

    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: `${player.name} desconfiou de ${targetPlayer.name}!`,
    });
  });

  socket.on('revealCards', () => {
    const player = game.state.players[socket.id];
    if (!player) {
      return socket.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: 'Você não está no jogo!',
      });
    }
  
    const playerCards = game.playerCards[player.id];
    if (!playerCards || playerCards.length === 0) {
      return socket.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: 'Você não tem cartas para revelar.',
      });
    }
  
    const cardsMessage = `Cartas de ${player.name}: ${playerCards.map(card => card.name).join(', ')}`;
    
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: cardsMessage,
    });
  });

  socket.on('swapCards', () => {
    if (!g.checkPlayerInGame()) return; // Verifica se o jogador está no jogo
  
    // Troca as cartas do jogador
    game.swapCards(player.id);
  
    // Obtém as novas cartas do jogador
    const newCards = game.playerCards[player.id];
  
    // Atualiza o estado do jogo para todos os jogadores
    io.emit('updateGame', game.state);
  
    // Envia uma mensagem para todos os jogadores
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: `${player.name} trocou suas cartas.`,
    });
  
    // Envia as novas cartas de volta para o jogador que solicitou a troca
    socket.emit('cardsUpdated', { cards: newCards });
  
    // Envia uma mensagem secreta para o jogador com suas novas cartas
    socket.emit('messageReceived', {
      player: { name: 'JOGO (secreto)' },
      message: `Suas novas cartas: ${newCards.map(card => card.name).join(', ')}`,
    });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${formattedPlayer}`);
    game.removePlayer(player.id);
    if (
      Object.keys(game.state.players).filter((playerId) =>
        g.checkPlayerInGame(playerId)
      ).length === 0
    ) {
      game.stopGame();
      messages = [];
    }
    socket.broadcast.emit('updateGame', game.state);
  });

  socket.on('startGame', () => {
    if (game.state.isStarted) {
      return; // Game already started
    }
    if (!g.checkPlayerInGame()) return;
    const playersOrderNames = commandHandler.startGame(io.sockets.sockets);
    console.log(`----- GAME STARTED (by ${formattedPlayer}) -----`);
    game.startGame();
    io.emit('updateGame', game.state); // Update game state for all players, since the game has started
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: `O jogo começou!<br/> A ordem dos jogadores é: ${playersOrderNames.join(
        ' → '
      )}`,
    });
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: `É a vez de ${
        game.state.players[game.state.playerInTurn].name
      }.`,
    });
  });

  socket.on('stopGame', () => {
    if (!g.checkPlayerInGame()) return;
    commandHandler.stopGame();
    console.log(`----- GAME STOPPED (by ${formattedPlayer}) -----`);
    io.emit('updateGame', game.state);

    g.resetGame();

    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message: 'O jogo foi encerrado.',
    });
  });

  socket.on('gameAction', ({ action, param }) => {
    if (!g.checkPlayerInGame()) return;
    const isRegularTurn = game.state.turnType === TurnTypes.REGULAR;
    if (
      (!isRegularTurn && player.id !== game.state.playerTempInTurn) ||
      (isRegularTurn && player.id !== game.state.playerInTurn)
    ) {
      return socket.emit('messageReceived', {
        player: { name: 'JOGO' },
        message: `Não é a sua vez, ${player.name}.`,
      });
    }

    let message = '';
    let proceedGame = true;

    // Caso seja um turno de perder uma carta para um golpe
    if (game.state.turnType === TurnTypes.DROP_CARD) {
      if (action !== 'coupDrop') {
        return socket.emit('messageReceived', {
          player: { name: 'JOGO' },
          message: `Você precisa descartar uma carta, ${player.name}.`,
        });
      }
    }

    if (game.state.turnType === TurnTypes.STEAL) {
      if (action !== 'accept_steal' && action !== 'block_steal') {
        return socket.emit('messageReceived', {
          player: { name: 'JOGO' },
          message: `Você precisa aceitar ou bloquear o roubo, ${player.name}.`,
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
        const {
          message: stealMessage,
          proceed: proceedSteal,
          targetId: stealTargetId,
        } = gameActionHandler.stealAttempt(player, param);
        // console.log('Antes do roubo');
        // console.log('Player in turn:', game.state.playerInTurn);
        // console.log('auxPlayerInTurn:', auxPlayerInTurn);

        if (!proceedSteal) {
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: stealMessage, // Corrigido
          });
        }

        if (!stealTargetId || !game.state.players[stealTargetId]) {
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: `Jogador inválido para roubo. Tente novamente, ${player.name}.`,
          });
        }

        // auxPlayerInTurn = game.state.playerInTurn;
        // game.state.playerInTurn = stealTargetId;
        // game.state.turnType = TurnTypes.STEAL;
        // console.log('Player in turn:', game.state.playerInTurn);
        // console.log('auxPlayerInTurn:', auxPlayerInTurn);

        io.emit('updateGame', game.state);

        m.sendMessageToAll({
          player: { name: 'JOGO' },
          message: `${player.name} tentou roubar ${param}! ${param}, você aceita ou bloqueia?`,
        });

        return;

      case 'accept_steal':
        const { message: acceptStealMessage, success: acceptStealSuccess } =
          gameActionHandler.accept_steal(player);
        message = acceptStealMessage;

        if (game.state.turnType !== TurnTypes.STEAL) {
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: 'Não há roubo para aceitar neste momento!',
          });
        }

        const thief = game.state.players[auxPlayerInTurn]; // Jogador que tentou roubar (deveria ser 'a')
        const victim = game.state.players[game.state.playerInTurn]; // Jogador que foi roubado (deveria ser 'b')

        if (!thief || !victim) {
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: 'Erro ao processar roubo. Jogadores inválidos!',
          });
        }

        // Determina a quantidade de moedas roubadas
        const stolenAmount = Math.min(victim.coins, 2); // O ladrão pode roubar no máximo 2 moedas ou tudo o que a vítima tiver

        // Atualiza as moedas dos jogadores
        victim.coins -= stolenAmount;
        thief.coins += stolenAmount;

        // Reseta o turno para o ladrão (quem tentou roubar)
        game.state.playerInTurn = auxPlayerInTurn;
        game.state.turnType = TurnTypes.REGULAR;
        auxPlayerInTurn = null;
        io.emit('updateGame', game.state);

        m.sendMessageToAll({
          player: { name: 'JOGO' },
          message: `${thief.name} roubou ${stolenAmount} moedas de ${victim.name}.`,
        });

        g.nextTurn(); // Agora o turno volta corretamente para 'a'
        return;

      case 'block_steal':
        if (game.state.turnType !== TurnTypes.STEAL) {
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: 'Não há roubo para bloquear neste momento!',
          });
        }

        const thiefBlocked = game.state.players[auxPlayerInTurn];
        const victimBlocked = game.state.players[game.state.playerInTurn];
        console.log(thiefBlocked, victimBlocked);

        if (!thiefBlocked || !victimBlocked) {
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: 'Erro ao processar o bloqueio. Jogadores inválidos!',
          });
        }

        // O roubo foi bloqueado, nada acontece com as moedas
        m.sendMessageToAll({
          player: { name: 'JOGO' },
          message: `Roubo bloqueado! Nenhuma moeda foi transferida.`,
        });

        // O turno volta para o jogador que tentou roubar
        // game.state.playerInTurn = auxPlayerInTurn;
        // game.state.turnType = TurnTypes.REGULAR;
        // auxPlayerInTurn = null;
        io.emit('updateGame', game.state);
        g.nextTurn(); // Continua o jogo normalmente
        return;

      case 'tax':
        message = gameActionHandler.tax(player);
        break;
      case 'coup':
        const {
          message: coupMessage,
          proceed,
          targetId: coupTargetId,
        } = gameActionHandler.coup(player, param);
        message = coupMessage;
        io.emit('updateGame', game.state);
        if (!proceed) {
          m.sendMessageToAll({
            player: { name: 'JOGO' },
            message,
          });
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: `Realize outra ação, ${player.name}.`,
          });
        } else {
          m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: `${player.name} deu um golpe em ${game.state.players[coupTargetId].name}!`,
          });
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: `${game.state.players[coupTargetId].name}, escolha uma carta para perder.`,
          });
        }
        break;
      case 'coupDrop':
        message = gameActionHandler.coupDrop(player, param);
        if (!message) {
          return m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: `Carta inválida, ${player.name}. Descarte uma carta.`,
          });
        }

        io.emit('updateGame', game.state);
        m.sendMessageToAll({
          player: { name: 'JOGO' },
          message: `${player.name} descartou uma carta. O turno volta para ${
            game.state.players[game.state.playerInTurn].name
          }.`,
        });
        break;
      case 'assassin':
        const { message: assassinMessage } = gameActionHandler.assassin(
          player,
          param
        );
        message = assassinMessage;
        proceedGame = false;
        break;

      case 'condessa':
        const { message: condessaMessage, success: _condessaSuccess } =
          gameActionHandler.contessa(player);
        message = condessaMessage;
        break;

      case 'assassinDrop':
        const { message: assassinDropMessage } = gameActionHandler.assassinDrop(
          player,
          param
        );
        message = assassinDropMessage;
        break;

      case 'block':
        const { message: blockMessage, success: _blockSuccess } =
          gameActionHandler.block(player, param);
        message = blockMessage;
        io.emit('updateGame', game.state);
        m.sendMessageToAll({
          player: { name: 'JOGO' },
          message: `${player.name} tentou bloqueou a ação!`,
        });
        // game.state.playerInTurn = auxPlayerInTurn;
        // game.state.turnType = TurnTypes.REGULAR;
        // auxPlayerInTurn = null;
        break;

      case 'accept':
        const { message: acceptMessage, success: _acceptSuccess } =
          gameActionHandler.accept(player);
        message = acceptMessage;
        io.emit('updateGame', game.state);
        m.sendMessageToAll({
          player: { name: 'JOGO' },
          message: `${player.name} aceitou o roubo!`,
        });
        // game.state.playerInTurn = auxPlayerInTurn;
        // game.state.turnType = TurnTypes.REGULAR;
        // auxPlayerInTurn = null;
        break;

      default:
        console.error(`Invalid action: ${action} by ${formattedPlayer}`);
        return m.sendMessageToAll({
          player: { name: 'JOGO' },
          message: `Ação inválida: ${action}`,
        });
    }

    console.log(`Player ${formattedPlayer} performed action: ${action}`);
    m.sendMessageToAll({
      player: { name: 'JOGO' },
      message,
    });

    if (g.checkLose()) {
      if (g.checkGameWon()) {
        g.handleGameWon();
        return;
      }
    }
    if (proceedGame) g.nextTurn();

    io.emit('updateGame', game.state);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Server is running on port ' + port);
});
