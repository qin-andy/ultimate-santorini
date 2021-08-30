import { Socket } from "socket.io";

export class Player {
  name: string;
  socket: Socket;
  id: string;
  inGame: boolean;

  constructor(sock: Socket, name?: string) {
    this.socket = sock;
    this.name = sock.id;
    this.id = sock.id;
    this.inGame = false;
    if (name) this.name = name;
  }
}