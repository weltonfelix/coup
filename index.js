import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import { Game } from "./public/js/game.js";
import { CommandHandler } from "./src/commandHandler.js";
import { GameActionHandler } from "./src/gameActionHandler.js";
import { MessageHelper } from "./src/messageHelper.js";
import { GameHelper } from "./src/gameHelper.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server);

app.use(express.static("public"));

const game = new Game();
const commandHandler = new CommandHandler(game, io);
const gameActionHandler = new GameActionHandler(game);
let messages = [];

// Message Helper (m)
const m = new MessageHelper(io, messages);

io.on("connection", (socket) => {
  console.log(
    `${socket.id} trying to connect using name: ${socket.handshake.auth.name}`
  );
  if (!socket.handshake.auth.name.trim()) {
    console.log("Player disconnected: No name provided");
    socket.emit("messageReceived", {
      player: { name: "JOGO" },
      message:
        "Nome de jogador não fornecido. Recarregue a página e tente novamente.",
    });
    return socket.disconnect();
  }

  if (
    game.getPlayerByName(socket.handshake.auth.name) ||
    socket.handshake.auth.name === "JOGO"
  ) {
    // Se o jogador já estiver no jogo, ou se o nome for "JOGO", desconectar
    // "JOGO" é o nome reservado para o sistema de mensagens
    console.log("Player disconnected: Name already in use");
    socket.emit("messageReceived", {
      player: { name: "JOGO" },
      message:
        "Nome de jogador já em uso. Recarregue a página e tente novamente.",
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
    socket.emit("messageReceived", message);
  }

  // Game Helper (g)
  const g = new GameHelper(game, player, formattedPlayer, io, socket, m);

  if (!game.state.isStarted) {
    game.addPlayer(player);
    io.emit("updateGame", {
      ...game.state, 
      playerCards: game.playerCards, 
    });
    m.sendMessageToAll({
      player: { name: "JOGO" },
      message: `${player.name} entrou no jogo!`,
    });
  } else {
    m.sendMessageToAll({
      player: { name: "JOGO" },
      message: `${player.name} entrou como espectador`,
    });
    socket.emit("messageReceived", {
      player: { name: "JOGO" },
      message:
        "O jogo já começou. Você pode assistir, mas não pode participar.",
    });
  }

  socket.on("sendMessage", (message, callback) => {
    console.log(`Player ${formattedPlayer} sent: ${message}`);
    m.sendMessageToOthers(socket, { player, message });
    callback(); // Essa função é chamada para confirmar ao cliente que a mensagem foi recebida
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${formattedPlayer}`);
    game.removePlayer(player.id);
    if (
      Object.keys(game.state.players).filter((playerId) =>
        game.isPlayerInGame(playerId)
      ).length === 0
    ) {
      game.stopGame();
      messages = [];
    } else if (game.state.playerInTurn === player.id) {
      game.nextTurn();
    }
    socket.broadcast.emit("updateGame", game.state);
    m.sendMessageToAll({
      player: { name: "JOGO" },
      message: `${player.name} saiu`,
    });
  });

  socket.on("startGame", () => {
    if (game.state.isStarted) {
      return; // Game already started
    }
    if (!g.checkPlayerInGame()) return;

    if (io.sockets.sockets.size < 2) {
      return m.sendMessageToAll({
        player: { name: "JOGO" },
        message: "É necessário pelo menos 2 jogadores para iniciar o jogo.",
      });
    }

    const success = commandHandler.startGame(io.sockets.sockets);

    if (!success) {
      return m.sendMessageToAll({
        player: { name: "JOGO" },
        message: "Erro ao iniciar o jogo.",
      });
    }

    console.log(`----- GAME STARTED (by ${formattedPlayer}) -----`);
    game.startGame();
    io.emit("updateGame", {
      ...game.state, 
      playerCards: game.playerCards, 
    });
    m.sendMessageToAll({
      player: { name: "JOGO" },
      message: `O jogo começou!<br/> A ordem dos jogadores é: ${game.state.playersOrder.join(
        " → "
      )}`,
    });

    m.sendMessageToAll({
      player: { name: "JOGO" },
      message: `É a vez de ${
        game.state.players[game.state.playerInTurn].name
      }.`,
    });
  });

  socket.on("stopGame", () => {
    if (!g.checkPlayerInGame()) return;
    commandHandler.stopGame();
    console.log(`----- GAME STOPPED (by ${formattedPlayer}) -----`);
    io.emit("updateGame", {
      ...game.state, 
      playerCards: game.playerCards,
    });

    g.resetGame();

    m.sendMessageToAll({
      player: { name: "JOGO" },
      message: "O jogo foi encerrado.",
    });
    io.emit("gameStopped");
  });

  socket.on("nextTurn", () => {
    if (!g.checkPlayerInGame()) return;
    if (game.state.playerInTurn !== player.id) return;
    game.nextTurn();
    io.emit("updateGame", {
      ...game.state, 
      playerCards: game.playerCards,
    });
    m.sendMessageToAll({
      player: { name: "JOGO" },
      message: `É a vez de ${
        game.state.players[game.state.playerInTurn].name
      }.`,
    });
  });

  socket.on("gameAction", ({ action, param }) => {
    if (!g.checkPlayerInGame()) return;

    let resultObject = {};

    switch (action) {
      case "dropCardMurder":
        resultObject = gameActionHandler.dropCardMurder(player, param);
        if (!resultObject) {
          return m.sendMessageToAll({
            player: { name: "JOGO" },
            message: `Erro. Tente novamente`,
          });
        }
        break;

      case "dropCardCoup":
        resultObject = gameActionHandler.dropCardCoup(player, param);
        if (!resultObject) {
          return m.sendMessageToAll({
            player: { name: "JOGO" },
            message: `Erro. Tente novamente`,
          });
        }
        break;

      case "drawCoins":
        resultObject = gameActionHandler.drawCoins(player, param);
        break;

      case "payCoins":
        resultObject = gameActionHandler.payCoins(player, param);
        break;

      case "steal":
        resultObject = gameActionHandler.steal(player, param);
        break;

      case "exchangeCard":
        resultObject = gameActionHandler.exchangeCard(player, param);
        socket.emit("updateCards", {
          cards: game.playerCards[player.id],
        });
        break;

      case 'ambassador':
        resultObject = gameActionHandler.ambassador(player);
        socket.emit('updateCards', {
          cards: game.playerCards[player.id],
        });
        break;

        case "returnCards":
          resultObject = gameActionHandler.returnCards(player, param);
          socket.emit("updateCards", {
            cards: game.playerCards[player.id],
          });
      
          if (!resultObject.success) {
            socket.emit('messageReceived', {
              player: { name: 'JOGO' },
              message: resultObject.message,
            });
          } else {
            m.sendMessageToAll({
              player: { name: 'JOGO' },
              message: resultObject.message,
            });
      
            // Emitir updateGame para todos os jogadores após a ação de devolver cartas
            io.emit("updateGame", {
              ...game.state,
              playerCards: game.playerCards,
            });
          }
          return;
          break;
        resultObject = gameActionHandler.returnCards(player, param);
        socket.emit("updateCards", {
          cards: game.playerCards[player.id],
        });

        if (!resultObject.success){

          socket.emit('messageReceived', {
            player: { name: 'JOGO' },
            message: resultObject.message,
          });

        } else {
          m.sendMessageToAll({
            player: { name: 'JOGO' },
            message: resultObject.message,
          });
        }
        return;
        break;
      case "revealCards":
        resultObject = gameActionHandler.revealCards(player, param);
        if (!resultObject.success) {
          // Envia a mensagem de erro apenas para o jogador que tentou revelar a carta
          socket.emit("messageReceived", {
            player: { name: "JOGO" },
            message: resultObject.message,
          });
          return; // Não continua com o restante da lógica
        }
        break;
      default:
        console.error(`Invalid action: ${action} by ${formattedPlayer}`);
        return m.sendMessageToAll({
          player: { name: "JOGO" },
          message: `Ação inválida: ${action}`,
        });
    }

    console.log(`Player ${formattedPlayer} performed action: ${action}`);
    if (action != "returnCards") {
      m.sendMessageToAll({
        player: { name: "JOGO" },
        message: resultObject.message,
      });
    }

    if (g.checkLose()) {
      if (g.checkGameWon()) {
        g.handleGameWon();
        return;
      }
    }

    io.emit("updateGame", {
      ...game.state, 
      playerCards: game.playerCards,
    });
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Server is running on port " + port);
});
