import { Game, TurnTypes } from './game.js';
import { Renderer } from './renderer.js';

const formElement = document.getElementById('form');
const inputElement = document.getElementById('input');
const messagesElement = document.getElementById('messages');

const messageRenderer = new Renderer(messagesElement);
const game = new Game();
const renderer = new Renderer();

let pendingAction = null;

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

    '/aceitar-roubo': () => {
      socket.emit('gameAction', { action: 'accept_steal' });
    },

    '/coup': (target) => {
      socket.emit('gameAction', { action: 'coup', param: target });
    },
    '/coupdrop': (cardName) => {
      if (
        !myCards.find(
          (card) => card.name.toLowerCase() === cardName.toLowerCase()
        )
      ) {
        return renderSecretMessage('Você não tem essa carta.');
      }
      socket.emit('gameAction', { action: 'coupDrop', param: cardName });
      myCards.splice(
        myCards.findIndex((card) => card.name === cardName),
        1
      );
    },

    '/assassinodrop': (cardName) => {
      if (
        !myCards.find(
          (card) => card.name.toLowerCase() === cardName.toLowerCase()
        )
      ) {
        return renderSecretMessage('Você não tem essa carta.');
      }
      socket.emit('gameAction', { action: 'assassinDrop', param: cardName });
      myCards.splice(
        myCards.findIndex((card) => card.name === cardName),
        1
      );
    },
    '/aceitar': () => {
      socket.emit('gameAction', { action: 'accept' });
    },
    '/confirmar': () => {
      if (!pendingAction) {
        return renderSecretMessage('Nenhuma ação pendente para confirmar.');
    }
    
    const { action, param } = pendingAction;
    pendingAction = null;
    
    socket.emit('gameAction', { action, param });
  },
  '/desconfiar': (target) => {
    if (!target) {
      return renderSecretMessage('Você precisa especificar o jogador que desconfia.');
    }
    socket.emit('doubtAction', { target });
    renderSecretMessage(`Você desconfiou de ${target}.`);
  },
};

const inTurnActionsWithConfirmation = {
  '/ajudaexterna': () => {
    pendingAction = { action: 'foreignAid' };
    socket.emit('attemptAction', { action: 'ajuda externa' });
    renderSecretMessage('Use /confirmar para confirmar a ação de ajuda externa.');
  },
  '/roubar': (target) => {
    pendingAction = { action: 'steal', param: target };
    socket.emit('attemptAction', { action: 'roubo', param: target });
    renderSecretMessage(`Use /confirmar para confirmar o roubo de ${target}.`);
  },
  '/bloqueio': () => {
    pendingAction = { action: 'block_steal' };
    socket.emit('attemptAction', { action: 'bloquear roubo' });
    renderSecretMessage('Use /confirmar para confirmar o bloqueio.');
  },
  '/imposto': () => {
    pendingAction = { action: 'tax' };
    socket.emit('attemptAction', { action: 'imposto' });
    renderSecretMessage('Use /confirmar para confirmar a ação de imposto.');
  },
  '/matar': (target) => {
    pendingAction = { action: 'assassin', param: target };
    socket.emit('attemptAction', { action: 'matar', param: target });
    renderSecretMessage(`Use /confirmar para confirmar o assassinato de ${target}.`);
  },
  '/condessa': () => {
    pendingAction = { action: 'condessa' };
    socket.emit('attemptAction', { action: 'condessa' });
    renderSecretMessage('Use /confirmar para confirmar a defesa com a Condessa.');
  },
};
  
  
  Object.assign(inTurnActions, inTurnActionsWithConfirmation);

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
      if (command === '/desconfiar') {
        const inTurnAction = inTurnActions[command];
        if (inTurnAction) {
          inTurnAction(param);
        }
        inputElement.value = '';
        return;
      }
      if (playerAction) {
        if (game.state.isStarted) {
          playerAction(param);
        } else {
          renderSecretMessage(`O jogo ainda não começou.`);
        }
      } else if (inTurnAction) {
        const isRegularTurn = game.state.turnType === TurnTypes.REGULAR;
        if (
          (!isRegularTurn && myPlayerId !== game.state.playerTempInTurn) ||
          (isRegularTurn && myPlayerId !== game.state.playerInTurn)
        ) {
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
