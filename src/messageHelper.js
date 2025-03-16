export class MessageHelper {
  #io;
  #messages;

  constructor (io, messages) {
    if (!io) {
      throw new Error('Socket.io instance is required');
    }
    if (!messages) {
      throw new Error('Messages array is required');
    }
    this.#io = io;
    this.#messages = messages;
  }

  sendMessageToAll(message) {
    this.#io.emit('messageReceived', message);
    this.#messages.push(message);
  }
  
  sendMessageToOthers(socket, message) {
    socket.broadcast.emit('messageReceived', message);
    this.#messages.push(message);
  }
}