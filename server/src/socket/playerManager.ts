import { Socket } from "socket.io";
import { ListenerFactoryPlayer } from "../types/types";

export class Player {
  name: string;
  socket: Socket;
  id: string;

  constructor(sock: Socket, name?: string) {
    this.socket = sock;
    this.name = sock.id;
    this.id = sock.id;
    if (name) this.name = name;
  }
}

export class PlayerManager {
  players: Player[];
  idMap: Map<string, Player>;

  constructor() {
    this.players = [];
    this.idMap = new Map<string, Player>();
  }

  addPlayer(player: Player): Player {
    this.players.push(player);
    this.idMap.set(player.id, player);
    player.socket.on('disconnect', () => () => {
      this.removePlayer(player.id);
    });
    return player;
  }

  removePlayer(id: string): Player {
    let removedPlayer: Player;
    removedPlayer = this.getPlayerById(id);
    this.players = this.players.filter((player) => {
      return player.id !== removedPlayer.id;
    });
    this.idMap.delete(id);
    removedPlayer.socket.removeAllListeners();
    removedPlayer.socket.disconnect();
    return removedPlayer;
  }

  getIds(): string[] {
    return this.players.map((player) => {
      return player.id;
    });
  }

  getNames(): string[] {
    return this.players.map((player) => {
      return player.name;
    });
  }

  getCount(): number {
    return this.players.length;
  }

  getPlayerById(id: string): Player {
    let player = this.idMap.get(id);
    if (player) {
      return player;
    }
    throw Error('player does not exist!');
  }

  close(): void {
    this.idMap.clear();
    this.players.forEach((player => {
      player.socket.disconnect();
    }));
    this.players = [];
  }
}