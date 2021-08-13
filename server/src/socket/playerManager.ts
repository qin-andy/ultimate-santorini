import { Socket } from "socket.io";

export class Player {
  displayName: string;
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

export class PlayerManager {
  players: Player[];

  constructor() {
    this.players = [];
  }

  addPlayer(socket: Socket, name: string): number {
    this.players.push(new Player(socket, name));
    return this.players.length;
  }

  getIds(): string[] {
    return this.players.map((player) => {
      return player.getSocketId();
    });
  }

  getNames(): string[] {
    return this.players.map((player) => {
      return player.getName();
    });
  }

  getCount(): number {
    return this.players.length;
  }

  // todo: get specific player
  // todo: add listener to specific player
  // todo: remove listener from specific player
  // todo: remove specific player
}