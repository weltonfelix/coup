import { Game } from './game.js';
import { Renderer } from './renderer.js';

const formElement = document.getElementById('form');
const inputElement = document.getElementById('input');
const messagesElement = document.getElementById('messages');

const renderer = new Renderer(messagesElement);
const game = new Game();

let playerName = window.prompt('Qual o seu nome?');
if (!playerName) {
  renderer.renderReceivedMessage(
    { name: 'JOGO' },
    'Você precisa de um nome para jogar. Recarregue a página e tente novamente.'
  );
  throw new Error('No name provided');
}

const socket = io({
  auth: {
    name: playerName,
  },
});

function sendTextMessage(message) {
  const el = renderer.renderSentMessage(message);
  socket.emit('sendMessage', message, () => {
    el.classList.remove('message-loading');
    el.classList.add('message-sent');
  }); // Essa função é chamada quando o servidor confirma o recebimento da mensagem
}

function renderSecretMessage(message) {
  renderer.renderReceivedMessage({ name: 'JOGO (secreto)' }, message);
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
    '/pegar': (amount) => {
      socket.emit('gameAction', { action: 'drawCoins', param: amount });
    },
    '/pagar': (amount) => {
      socket.emit('gameAction', { action: 'payCoins', param: amount });
    },
    '/drop': (cardName) => {
      if (
        !myCards.find(
          (card) => card.name.toLowerCase() === cardName.toLowerCase()
        )
      ) {
        return renderSecretMessage('Você não tem essa carta.');
      }
      socket.emit('gameAction', { action: 'dropCard', param: cardName });
      myCards.splice(
        myCards.findIndex((card) => card.name === cardName),
        1
      );
    },
    '/trocar': (cardName) => {
      if (
        !myCards.find(
          (card) => card.name.toLowerCase() === cardName.toLowerCase()
        )
      ) {
        return renderSecretMessage('Você não tem essa carta.');
      }
      socket.emit('gameAction', { action: 'exchangeCard', param: cardName });
      // Não precisa remover, pois vai receber as duas cartas de volta com um updateCards
    },
    '/embaixador': () => {
      socket.emit('gameAction', { action: 'ambassador'});
    },
    '/devolver': (cartas) => {
      const cartas2 = cartas.map((carta) => carta.replaceAll(',', ''));
      const myCardsNames = [...myCards];
      for (const carta of cartas2) {
        if (
          !myCardsNames.splice(
            myCards.findIndex((card) => card.name.toLowerCase() === carta.toLowerCase()),
            1)
        ) {
          return renderSecretMessage(`Você não tem a carta ${carta}.`);
        }
      }
      socket.emit('gameAction', { action: 'returnCards', param: cartas2 });
    }
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
      const [command, ...param] = message.trim().split(' '); // Remove os espaços extra e divide por " "
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

    renderer.renderReceivedMessage(player, message);
    console.log(message);

    // Verifica se a mensagem envolve pegar moedas e dispara a animação
    if (
      message.includes('renda') ||
      message.includes('ajuda externa') ||
      message.includes('imposto')
    ) {
      console.log('moeda');
      renderer.showCoinAnimation();
    }
  });

  socket.on('updateGame', (state) => {
    game.updateGame(state);
    if (!game.state.isStarted) {
      myCards = [];
    }
  });

  socket.on('updateCards', ({ cards }) => {
    console.log('Game started');
    myCards = cards;
    renderer.renderReceivedMessage(
      { name: 'JOGO' },
      `Suas cartas: ${myCards.map((card) => card.name).join(' e ')}`
    );
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${myPlayerId}`);
    socket.close();
    renderer.renderReceivedMessage(
      { name: 'JOGO' },
      'Você foi desconectado. Recarregue a página para jogar novamente.'
    )
    inputElement.disabled = true;
    const reloadButton = document.createElement('button');
    reloadButton.textContent = 'Recarregar';
    reloadButton.onclick = () => window.location.reload();
    messagesElement.prepend(reloadButton);
  });
});
