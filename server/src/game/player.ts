import { Socket } from "socket.io";
import { Game } from "./game";

export class Player {
  name: string;
  socket: Socket;
  id: string;
  inGame: boolean;
  currentGame: null | Game;

  constructor(sock: Socket, name?: string) {
    this.socket = sock;
    this.name = sock.id;
    this.id = sock.id;
    this.inGame = false;
    this.currentGame = null;
    if (name) this.name = name;
  }
}