export class Renderer {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.coinAnimation = document.querySelector('#coin-animation');
  }

  renderSentMessage(message) {
    const el = this.#createMessageEl(true);
    el.classList.add('message-loading');
    el.innerHTML = `<p>${message}</p>`;
    this.containerEl.prepend(el); // Add the message to the top of the list (most recent)
    return el;
  }

  renderReceivedMessage(player, message) {
    const el = this.#createMessageEl(false);
    if (player.name === 'JOGO') {
      el.classList.remove('received');
      el.classList.add('received-from-game');
    }
    el.innerHTML = `
      <p>${message}</p>
    `;
    this.containerEl.prepend(el);
  }

  #createMessageEl(sent) {
    const messageEl = document.createElement('li');
    messageEl.classList.add(sent ? 'sent' : 'received');
    return messageEl;
  }

  showCoinAnimation() {
    if (!this.coinAnimation) return; // Evita erro caso o elemento não exista

    this.coinAnimation.style.display = "block";  // Torna o GIF visível
    setTimeout(() => {
      this.coinAnimation.style.display = "none";  // Esconde o GIF após 2 segundos
    }, 2000);
  }
}

