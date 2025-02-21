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

socket.on('connect', () => {
  const myPlayerId = socket.id;
  let myCards = [];

  formElement.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = inputElement.value;
    if (game.state.isStarted) {
      if (message === '/moedas') {
        messageRenderer.renderReceivedMessage(
          { name: 'JOGO (secreto)' },
          `Você tem ${game.state.players[myPlayerId].coins} moedas`
        );
        return;
      } else if (message === '/cartas') {
        messageRenderer.renderReceivedMessage(
          { name: 'JOGO (secreto)' },
          `Suas cartas: ${myCards.map((card) => card.name).join(' e ')}`
        );
        return;
      }
    }
    socket.emit('sendMessage', message);
    messageRenderer.renderSentMessage(message);
    if (message === '/iniciar') {
      socket.emit('startGame');
    } else if (message === '/parar') {
      socket.emit('stopGame');
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
