import { Socket } from "socket.io";

export class Player {
  displayName: string;
  socketId: string;
  socket: Socket;

  constructor(sock: Socket, name: string) {
    this.socket = sock;
    this.displayName = name;
  }

  setName(name: string): void {
    this.displayName = name;
  }

  getName(): string {
    return this.displayName;
  }

  getSocketId(): string {
    return this.socket.id;
  }
}