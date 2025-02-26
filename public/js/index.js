import { Game } from './game.js';
import { Renderer } from './renderer.js';

const formElement = document.getElementById('form');
const inputElement = document.getElementById('input');
const messagesElement = document.getElementById('messages');

const messageRenderer = new Renderer(messagesElement);
const game = new Game();

let playerName = window.prompt('Qual o seu nome?');
while (!playerName) {
  playerName = window.prompt('Qual o seu nome?');
}

const socket = io({
  auth: {
    name: playerName,
  },
});

function sendTextMessage(message) {
  const el = messageRenderer.renderSentMessage(message);
  socket.emit('sendMessage', message, () => {
    el.classList.remove('message-loading');
    el.classList.add('message-sent');
  }); // Essa função é chamada quando o servidor confirma o recebimento da mensagem
}

function renderSecretMessage(message) {
  messageRenderer.renderReceivedMessage({ name: 'JOGO (secreto)' }, message);
}

const commands = {
  '/iniciar': () => {
    socket.emit('startGame');
  },
  '/parar': () => {
    socket.emit('stopGame');
  },
};

socket.on('connect', () => {
  const myPlayerId = socket.id;
  let myCards = [];

  const playerActions = {
    '/moedas': () => {
      const players = game.state.players;
      let message = '';
      message += `Você: ${players[myPlayerId].coins} moedas.\n`;
      for (const [playerId, player] of Object.entries(players)) {
        if (playerId !== myPlayerId) {
          message += `${player.name}: ${player.coins} moedas.\n`;
        }
      }
      renderSecretMessage(message);
    },
    '/cartas': () => {
      renderSecretMessage(
        `Suas cartas: ${myCards.map((card) => card.name).join(' e ')}.`
      );
    },
  };

  const inTurnActions = {
    '/renda': () => {
      socket.emit('gameAction', { action: 'income' });
    },
    '/ajudaexterna': () => {
      socket.emit('gameAction', { action: 'foreignAid' });
    },
    '/roubar': (target) => {
      socket.emit('gameAction', { action: 'steal', param: target });
    },
    '/imposto': () => {
      socket.emit('gameAction', { action: 'tax' });
    },
    '/coup': (target) => {
      socket.emit('gameAction', { action: 'coup', param: target });
    },
    '/coupdrop': (cardName) => {
      if (!myCards.find((card) => card.name === cardName)) {
        return renderSecretMessage('Você não tem essa carta.');
      }
      socket.emit('gameAction', { action: 'coupDrop', param: cardName });
      myCards.splice(
        myCards.findIndex((card) => card.name === cardName),
        1
      );
    },
  };

  formElement.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = inputElement.value;
    if (message.length === 0) return;

    // Check if the message is a game command
    if (message.startsWith('/')) {
      console.log(game.state);
      if (!game.isPlayerInGame(myPlayerId)) {
        return renderSecretMessage(
          'Você não está no jogo! Espere o próximo jogo começar.'
        );
      }
      const [command, param] = message.trim().split(' '); // Remove os espaços extra e divide por " "
      // Esse parâmetro é opcional, então pode ser undefined. Ele pode ser um jogador alvo, ou o nome de uma carta (no caso de coupDrop)
      const playerAction = playerActions[command];
      const inTurnAction = inTurnActions[command];
      if (playerAction) {
        if (game.state.isStarted) {
          playerAction(param);
        } else {
          renderSecretMessage(`O jogo ainda não começou.`);
        }
      } else if (inTurnAction) {
        if (game.state.playerInTurn !== myPlayerId) {
          return renderSecretMessage(`Não é a sua vez.`);
        }
        if (game.state.isStarted) {
          inTurnAction(param);
        } else {
          renderSecretMessage(`O jogo ainda não começou.`);
        }
      } else {
        const gameCommand = commands[command];
        if (gameCommand) {
          gameCommand();
        } else {
          sendTextMessage(message);
        }
      }
    } else {
      sendTextMessage(message);
    }
    inputElement.value = '';
  });

  console.log(`${playerName} connected: ${myPlayerId}`);
  socket.on('messageReceived', ({ player, message }) => {
    if (player.id === myPlayerId) {
      return;
    }
    messageRenderer.renderReceivedMessage(player, message);
  });

  socket.on('updateGame', (state) => {
    game.updateGame(state);
    if (!game.state.isStarted) {
      myCards = [];
    }
  });

  socket.on('gameStarted', ({ cards }) => {
    console.log('Game started');
    myCards = cards;
    messageRenderer.renderReceivedMessage(
      { name: 'JOGO' },
      `Suas cartas: ${myCards.map((card) => card.name).join(' e ')}`
    );
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${myPlayerId}`);
    socket.close();
  });
});
