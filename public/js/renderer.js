export class Renderer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.coinAnimation = document.querySelector("#coin-animation");
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

  showCoinAnimation() {
    if (!this.coinAnimation) return; 

    this.coinAnimation.style.display = "block"; 
    setTimeout(() => {
      this.coinAnimation.style.display = "none"; 
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
