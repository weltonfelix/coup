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
  socket.emit('sendMessage', message);
  messageRenderer.renderSentMessage(message);
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

  const inGameActions = {
    '/moedas': () => {
      renderSecretMessage(
        `Você tem ${game.state.players[myPlayerId].coins} moedas.`
      );
    },
    '/cartas': () => {
      renderSecretMessage(
        `Suas cartas: ${myCards.map((card) => card.name).join(' e ')}.`
      );
    },
  };

  formElement.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = inputElement.value;

    // Check if the message is a game command
    if (message.startsWith('/')) {
      const gameAction = inGameActions[message];
      if (gameAction) {
        if (game.state.isStarted) {
          gameAction();
        } else {
          // TODO: Informar que o jogo não está iniciado
        }
      } else {
        const command = commands[message];
        if (command) {
          command();
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
  game.addPlayer({
    id: myPlayerId,
    name: playerName,
  });

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
