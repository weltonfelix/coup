export class Renderer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.coinContainer = document.querySelector("#coin-container");
    this.murderAnimation = document.querySelector("#murder-animation");
  }

  renderSentMessage(message) {
    const el = this.#createMessageEl(true);
    el.classList.add("message-loading");
    el.innerHTML = `<p>${message}</p>`;
    this.containerEl.prepend(el); // Add the message to the top of the list (most recent)
    return el;
  }

  renderReceivedMessage(player, message) {
    const el = this.#createMessageEl(false);
    const isGameMessage = player.name === "JOGO";
    const isGameSecretMessage = player.name === "JOGO (secreto)";
    if (isGameMessage || isGameSecretMessage) {
      el.classList.remove("received");
      el.classList.add("received-from-game");
    }
    if (isGameSecretMessage) {
      el.innerHTML = `
        <span class="secret">Mensagem Secreta</span>
        <p>${message}</p>
      `;
    } else if (isGameMessage) {
      el.innerHTML = `
        <p>${message}</p>
      `;
    } else {
      el.innerHTML = `
      <strong>${player.name}</strong>
      <p>${message}</p>
    `;
    }
    this.containerEl.prepend(el);
  }

  #createMessageEl(sent) {
    const messageEl = document.createElement("li");
    messageEl.classList.add(sent ? "sent" : "received");
    return messageEl;
  }

  showCoinAnimation(numCoins) {
    if (!this.coinContainer) return;

    this.coinContainer.innerHTML = "";

    for (let i = 0; i < numCoins; i++) {
      const coin = document.createElement("img");
      coin.src = "assets/game/coin.gif";
      coin.alt = "Moeda animada";
      coin.classList.add("coin");
      this.coinContainer.appendChild(coin);
    }

    this.coinContainer.style.display = "flex";

    setTimeout(() => {
      this.coinContainer.style.display = "none";
    }, 2000);
  }

  showMurderAnimation() {
    if (!this.murderAnimation) return;

    this.murderAnimation.style.display = "block";
    setTimeout(() => {
      this.murderAnimation.style.display = "none";
    }, 2000);
  }
}
