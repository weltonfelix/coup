import { Game } from "./game.js";
import { Renderer } from "./renderer.js";

const formElement = document.getElementById("form");
const inputElement = document.getElementById("input");
const submitButtonElement = document.getElementById("submit-button");
const messagesElement = document.getElementById("messages");
const inTurnActionsDivElement = document.getElementById("inTurnActions");
const playersOrderElement = document.getElementById("playersOrder");
const playersOrderTextElement = document.getElementById("playersOrder-field");

// Selecionar os elementos dos botões e pop-ups
const popupButton = document.getElementById("popup-button");
const popupContainer = document.getElementById("popup-container");
const closePopup = document.getElementById("close-popup");

const cardsButton = document.querySelector(
  ".cards-button .button-cards"
);
const coinsButton = document.querySelector(
  ".coins-button .button-coins"
);

const overlay = document.getElementById("overlay");

const renderer = new Renderer(messagesElement);
const game = new Game();

const commandHistory = [];
let historyCursor = 0;
const updateHistory = (command) => {
  if (command !== commandHistory.at(-1)) {
    commandHistory.push(command);
    historyCursor = commandHistory.length - 1;
  }
};

let playerName;
let isValid = false;

while (!isValid) {
  playerName = window.prompt("Qual o seu nome? (Máximo 12 caracteres)");
  
  if (!playerName) {
    renderer.renderReceivedMessage(
      { name: "JOGO" },
      "Você precisa de um nome para jogar. Recarregue a página e tente novamente."
    );
    throw new Error("No name provided");
  }

  if (playerName.length > 12) {
    alert("O nome não pode ter mais de 12 caracteres. Tente novamente.");
  } else {
    isValid = true; // Sai do loop se o nome for válido
  }
}

const socket = io({
  auth: {
    name: playerName,
  },
});

function sendTextMessage(message) {
  const el = renderer.renderSentMessage(message);
  socket.emit("sendMessage", message, () => {
    el.classList.remove("message-loading");
    el.classList.add("message-sent");
  });
}

function renderSecretMessage(message) {
  renderer.renderReceivedMessage({ name: "JOGO (secreto)" }, message);
}

// Aplicar o efeito de tilt nas imagens
function applyTiltEffect(images) {
  images.forEach((image) => {
    image.addEventListener("mousemove", (event) => {
      const rect = image.getBoundingClientRect();

      const mouseX = (event.clientX - rect.left) / (rect.right - rect.left);
      const mouseY = (event.clientY - rect.top) / (rect.bottom - rect.top);

      const tiltX = (mouseY - 0.7) * 20;
      const tiltY = (mouseX - 0.7) * -20;

      image.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      image.style.boxShadow = `${tiltY * 2}px ${
        tiltX * 2
      }px 20px rgba(0, 0, 0, 0.3)`;
    });

    image.addEventListener("mouseleave", () => {
      image.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
      image.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.2)";

      image.style.transition = "transform 0.5s ease, box-shadow 0.5s ease";

      setTimeout(() => {
        image.style.transition = "";
      }, 500);
    });

    image.style.transformStyle = "preserve-3d";
    image.style.willChange = "transform";
  });
}

function showPlayerCoins(players) {
  const coinsList = document.getElementById("coins-list");
  coinsList.innerHTML = "";

  for (const playerId in players) {
    const player = players[playerId];
    const coinItem = document.createElement("div");
    coinItem.className = "coin-item";

    const playerName = document.createElement("span");
    playerName.className = "player-name";
    if (playerId === socket.id) {
      playerName.textContent = `${player.name}(Você)`;
    } else {
      playerName.textContent = player.name;
    }

    const coinAmount = document.createElement("span");
    coinAmount.className = "coin-amount";
    coinAmount.textContent = `${player.coins} moedas💲`;

    coinItem.appendChild(playerName);
    coinItem.appendChild(coinAmount);

    coinsList.appendChild(coinItem);
  }

  const coinsContainer = document.getElementById("coins-container");
  coinsContainer.classList.add("show");
  overlay.classList.add("show");
}

const commands = {
  "/iniciar": () => {
    socket.emit("startGame");
  },
  "/parar": () => {
    socket.emit("stopGame");
  },
};

socket.on("connect", () => {
  const myPlayerId = socket.id;
  let myCards = [];

  function updatedCurrentPlayerOrder() {
    const playerInTurnName = game.state.players[game.state.playerInTurn]?.name;
    if (!playerInTurnName) return;

    playersOrderTextElement.innerHTML = game.state.playersOrder
      .map((player) => {
        if (player === playerInTurnName) {
          return `<strong>${player}</strong>`;
        }
        return player;
      })
      .join(" → ");
  }

  popupButton.addEventListener("click", () => {
    popupContainer.classList.add("show");
  });

  closePopup.addEventListener("click", () => {
    popupContainer.classList.remove("show");
  });

  window.addEventListener("click", (event) => {
    if (event.target === popupContainer) {
      popupContainer.classList.remove("show");
    }
  });

  cardsButton.addEventListener("click", () => {
    const cardsContainer = document.getElementById("cards-container");
    const myCardsTitle = document.getElementById("my-cards-title");
    const myCardsDiv = document.getElementById("my-cards");
    const otherPlayersCardsCountDiv = document.getElementById("other-players-cards-count");
    const closeButtonCards = document.getElementById("close-button-cards");

    myCardsDiv.innerHTML = "";
    otherPlayersCardsCountDiv.innerHTML = "<h4>Quantidade de Cartas dos Outros Jogadores</h4>";
    myCardsTitle.textContent = myCards && myCards.length > 0 ? "Suas Cartas" : "Você não possui cartas.";
    cardsContainer.appendChild(myCardsTitle);

    myCardsDiv.innerHTML = "";
    myCards.forEach((card) => {
      const img = document.createElement("img");
      img.src = `assets/game/cards/${card.name.toLowerCase()}.png`;
      img.alt = card.name;
      img.className = "displayed-cards tilt-image";
      myCardsDiv.appendChild(img);
    });
    cardsContainer.appendChild(myCardsDiv);

    // Exibir a quantidade de cartas dos outros jogadores
    otherPlayersCardsCountDiv.innerHTML = "<h4>Quantidade de Cartas dos Outros Jogadores</h4>";
    const playersCardsCountList = document.createElement("div");
    playersCardsCountList.className = "player-cards-count";

    for (const [playerId, player] of Object.entries(game.state.players)) {
      if (playerId !== myPlayerId) {
        const playerCardCountItem = document.createElement("div");
        playerCardCountItem.className = "player-card-count-item";

        const playerNameSpan = document.createElement("span");
        playerNameSpan.className = "player-name";
        playerNameSpan.textContent = player.name;

        const cardsCountSpan = document.createElement("span");
        cardsCountSpan.className = "cards-count";
        const numCartas = game.playerCards[playerId] ? game.playerCards[playerId].length : 0;
        cardsCountSpan.textContent = `${numCartas} cartas`;


        playerCardCountItem.appendChild(playerNameSpan);
        playerCardCountItem.appendChild(cardsCountSpan);
        playersCardsCountList.appendChild(playerCardCountItem);
      }
    }


    otherPlayersCardsCountDiv.appendChild(playersCardsCountList);
    cardsContainer.appendChild(otherPlayersCardsCountDiv);

    cardsContainer.classList.add("show");
    overlay.classList.add("show");

    window.addEventListener("click", (event) => {
      if (event.target === overlay || event.target === cardsContainer || event.target === closeButtonCards) {
        cardsContainer.classList.remove("show");
        overlay.classList.remove("show");
      }
    });

    const tiltImages = document.querySelectorAll(".tilt-image");
    applyTiltEffect(tiltImages);
  });

  coinsButton.addEventListener("click", () => {
    const players = game.state.players;
    const coinsContainer = document.getElementById("coins-container");
    const closeButtonCoins = document.getElementById("close-button-coins");
    showPlayerCoins(players);

    window.addEventListener("click", (event) => {
      if (event.target === overlay || event.target === coinsContainer || event.target === closeButtonCoins) {
        coinsContainer.classList.remove("show");
        overlay.classList.remove("show");
      }
    });
  });

  const playerActions = {
    "/moedas": () => {
      const players = game.state.players;
      let message = "";
      message += `Você: ${players[myPlayerId].coins} moedas. <br/>`;
      for (const [playerId, player] of Object.entries(players)) {
        if (playerId !== myPlayerId) {
          message += `${player.name}: ${player.coins} moedas. <br/>`;
        }
      }
      renderSecretMessage(message);
    },
    "/cartas": () => {
      renderSecretMessage(
        `Suas cartas: <br/> ${myCards.map((card) => card.name).join("<br/>")}.`
      );
    },
  };

  const inTurnActions = {
    "/pegar": (amount) => {
      socket.emit("gameAction", { action: "drawCoins", param: amount });
    },
    "/renda": () => {
      socket.emit("gameAction", { action: "drawCoins", param: 1 });
    },
    "/ajudaexterna": () => {
      socket.emit("gameAction", { action: "drawCoins", param: 2 });
    },
    "/duque": () => {
      socket.emit("gameAction", { action: "drawCoins", param: 3 });
    },
    "/roubar": (target) => {
      socket.emit("gameAction", { action: "steal", param: target });
    },
    "/pagar": (amount) => {
      socket.emit("gameAction", { action: "payCoins", param: amount });
    },
    "/dropassassinato": (cardName) => {
      if (
        !myCards.find(
          (card) => card.name.toLowerCase() === cardName[0].toLowerCase()
        )
      ) {
        return renderSecretMessage("Você não tem essa carta.");
      }
      socket.emit("gameAction", {
        action: "dropCardMurder",
        param: cardName[0],
      });
      myCards.splice(
        myCards.findIndex((card) => card.name === cardName[0]),
        1
      );
    },
    "/dropgolpe": (cardName) => {
      if (
        !myCards.find(
          (card) => card.name.toLowerCase() === cardName[0].toLowerCase()
        )
      ) {
        return renderSecretMessage("Você não tem essa carta.");
      }
      socket.emit("gameAction", { action: "dropCardCoup", param: cardName[0] });
      myCards.splice(
        myCards.findIndex((card) => card.name === cardName[0]),
        1
      );
    },
    "/trocar": (cardName) => {
      const cardNameString = cardName[0];

      if (!myCards.find((card) => card.name.toLowerCase() === cardNameString.toLowerCase())) {
        return renderSecretMessage("Você não tem essa carta.");
      }

      socket.emit("gameAction", { action: "exchangeCard", param: cardNameString });
      // Não precisa remover, pois vai receber as duas cartas de volta com um updateCards
    },
    "/embaixador": () => {
      socket.emit("gameAction", { action: "ambassador" });
    },
    "/devolver": (cartas) => {
      const cartas2 = cartas.map((carta) => carta.replaceAll(",", ""));
      const myCardsNames = [...myCards];
      for (const carta of cartas2) {
        if (
          !myCardsNames.splice(
            myCards.findIndex(
              (card) => card.name.toLowerCase() === carta.toLowerCase()
            ),
            1
          )
        ) {
          return renderSecretMessage(`Você não tem a carta ${carta}.`);
        }
      }
      socket.emit("gameAction", { action: "returnCards", param: cartas2 });
    },
    "/proximo": () => {
      socket.emit("nextTurn");
    },
  };

  inputElement.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      if (historyCursor === -1) historyCursor = commandHistory.length - 1;
      const lastCommand = commandHistory.at(historyCursor--);
      if (lastCommand) {
        inputElement.value = lastCommand;
      }
    } else if (event.key === "ArrowDown") {
      if (historyCursor === commandHistory.length) historyCursor = 0;
      const nextCommand = commandHistory.at(historyCursor++);
      if (nextCommand) {
        inputElement.value = nextCommand;
      }
    }
  });
  submitButtonElement.addEventListener("click", () => {
    formElement.dispatchEvent(new Event("submit"));
    inputElement.focus();
  });

  formElement.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = inputElement.value;
    if (message.length === 0) return;

    // Check if the message is a game command
    if (message.startsWith("/")) {
      console.log(game.state);
      if (!game.isPlayerInGame(myPlayerId)) {
        return renderSecretMessage(
          "Você não está no jogo! Espere o próximo jogo começar."
        );
      }
      const [command, ...param] = message.trim().split(" "); // Remove os espaços extra e divide por " "
      // Esse parâmetro é opcional, então pode ser undefined. Ele pode ser um jogador alvo, ou o nome de uma carta (no caso de coupDrop)
      const playerAction = playerActions[command];
      const inTurnAction = inTurnActions[command];
      if (playerAction) {
        if (game.state.isStarted) {
          playerAction(param);
        } else {
          renderSecretMessage(`O jogo ainda não começou.`);
        }
        updateHistory(command);
      } else if (inTurnAction) {
        if (game.state.isStarted) {
          inTurnAction(param);
          updateHistory(command);
        } else {
          renderSecretMessage(`O jogo ainda não começou.`);
        }
      } else {
        const gameCommand = commands[command];
        if (gameCommand) {
          gameCommand();
          updateHistory(command);
        } else {
          sendTextMessage(message);
        }
      }
    } else {
      sendTextMessage(message);
    }
    inputElement.value = "";
  });

  const inTurnActionButtonsEls = inTurnActionsDivElement.children;
  for (const button of inTurnActionButtonsEls) {
    button.addEventListener("click", () => {
      const command = button.getAttribute("data-command");
      inputElement.value = command;
      inputElement.focus();
    });
  }

  const playerColors = {};

  function getPlayerColor(playerName) {
    if (!playerColors[playerName]) {
      const colors = [
        "player-name-color-1",
        "player-name-color-2",
        "player-name-color-3",
        "player-name-color-4",
        "player-name-color-5",
        "player-name-color-6",
        "player-name-color-7",
        "player-name-color-8",
        "player-name-color-9",
        "player-name-color-10",
      ];

      const hash = playerName
        .split("")
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const index = hash % colors.length;
      playerColors[playerName] = colors[index];
    }

    return playerColors[playerName];
  }

  console.log(`${playerName} connected: ${myPlayerId}`);
  socket.on("messageReceived", ({ player, message }) => {
    if (player.id === myPlayerId) {
      return;
    }

    if (player.name === "JOGO") {
      // Verifica se é uma mensagem de entrada/saída
      if (message.includes("entrou") || message.includes("saiu")) {
        const messageEl = document.createElement("li");
        messageEl.classList.add("received-from-game", "event");
        messageEl.innerHTML = `<em>${message}</em>`;
        messagesElement.prepend(messageEl);
      } else {
        renderer.renderReceivedMessage(player, message);
      }
    } else {
      const colorClass = getPlayerColor(player.name);
      const messageEl = document.createElement("li");
      messageEl.classList.add("received");
      messageEl.innerHTML = `
        <strong class="${colorClass}">${player.name}</strong>
        <p>${message}</p>
      `;
      messagesElement.prepend(messageEl);
    }

    console.log(message);

    if (message.includes("Renda")) {
      console.log("renda");
      renderer.showCoinAnimation(1);
    } else if (message.includes("Ajuda Extra")) {
      renderer.showCoinAnimation(2);
    } else if (message.includes("Imposto")) {
      renderer.showCoinAnimation(3);
    } else if (message.includes("assassinado")) {
      renderer.showMurderAnimation();
    }
  });

  socket.on("updateGame", (state) => {
    game.updateGame(state);
    if (game.state.players[myPlayerId]) {
      myCards = game.playerCards[myPlayerId] || [];
    }  
    if (!game.state.isStarted) {
      myCards = [];
    }
    if (game.state.playersOrder.length > 0) {
      playersOrderElement.classList.add("show");
    } else {
      playersOrderElement.classList.remove("show");
    }
    updatedCurrentPlayerOrder();

    if (game.state.playerInTurn === myPlayerId) {
      inTurnActionsDivElement.classList.add("show");
    } else {
      inTurnActionsDivElement.classList.remove("show");
    }
  });

  socket.on("updateCards", ({ cards }) => {
    console.log("Game started");
    myCards = cards;
    renderer.renderReceivedMessage(
      { name: "JOGO" },
      `Suas cartas: <br/> ${myCards.map((card) => card.name).join("<br/>")}`
    );
  });

  socket.on("gameStopped", () => {
    playersOrderElement.classList.remove("show");
    inTurnActionsDivElement.classList.remove("show");
    playersOrderTextElement.innerHTML = "";
    playersOrder = [];
  });

  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${myPlayerId}`);
    socket.close();
    renderer.renderReceivedMessage(
      { name: "JOGO" },
      "Você foi desconectado. Recarregue a página para jogar novamente."
    );
    inputElement.disabled = true;
    playersOrderElement.classList.remove("show");
    inTurnActionsDivElement.classList.remove("show");
    const reloadButton = document.createElement("button");
    reloadButton.textContent = "Recarregar";
    reloadButton.onclick = () => window.location.reload();
    messagesElement.prepend(reloadButton);
  });
});
