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

  addListener(eventName: string, fn: (data: any) => void): void {
    this.socket.on(eventName, fn);
  }

  removeListener(eventName: string): void {
    this.socket.removeAllListeners(eventName);
  }

  disconnect(): void {
    this.socket.disconnect();
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
    let newPlayer = player;
    this.players.push(newPlayer);
    this.idMap.set(player.getSocketId(), newPlayer);
    player.addListener('disconnect', () => {
      this.removePlayer(newPlayer.getSocketId());
    });
    return newPlayer;
  }

  removePlayer(id: string): Player {
    let removedPlayer = this.getPlayerById(id);
    this.players = this.players.filter((player) => {
      return player.getSocketId() !== removedPlayer.getSocketId();
    });
    return removedPlayer;
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

  getPlayerById(id: string): Player {
    let player = this.idMap.get(id);
    if (player) {
      return player;
    }
    throw new Error('Player does not exist!');
  }

  addListener(id: string, eventName: string, fn: (data: any) => {}): void {
    this.getPlayerById(id).addListener(eventName, fn);
  }

  removeListener(id: string, eventName: string): void {
    this.getPlayerById(id).removeListener(eventName);
  }

  addListenerToAll(eventName: string, fn: (data: any) => {}): void {
    this.players.forEach((player) => player.addListener(eventName, fn));
  }

  removeListenerFromAll(eventName: string): void {
    this.players.forEach((player) => player.removeListener(eventName));
  }

  disconnectAll(): void {
    this.players.forEach((player => {
     player.disconnect();
    }));
    this.players = [];
  }
}