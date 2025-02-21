export class Renderer {
  constructor(containerEl) {
    this.containerEl = containerEl;
  }

  renderSentMessage(message) {
    const el = this.#createMessageEl(true);
    el.innerHTML = `<p>${message}</p>`;
    this.containerEl.appendChild(el);
  }

  renderReceivedMessage(player, message) {
    const el = this.#createMessageEl(false);
    el.innerHTML = `
      <strong>${player.name}</strong>
      <p>${message}</p>
    `;
    this.containerEl.appendChild(el);
  }

  #createMessageEl(sent) {
    const messageEl = document.createElement('li');
    messageEl.classList.add(sent ? 'sent' : 'received');
    return messageEl;
  }
}
