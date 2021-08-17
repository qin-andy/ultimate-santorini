import { Socket } from "socket.io";
import { ListenerFactoryPlayer } from "../types/types";

export class Player {
  displayName: string;
  socket: Socket;

  constructor(sock: Socket, name: string) {
    this.socket = sock;
    this.displayName = name;
  }

  getName(): string {
    return this.displayName;
  }

  getId(): string {
    return this.socket.id;
  }

  addListener(eventName: string, fn: (data?: any) => void): void {
    this.socket.on(eventName, fn);
  }

  removeListener(eventName: string): void {
    this.socket.removeAllListeners(eventName);
  }

  disconnect(): void {
    this.socket.removeAllListeners();
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
    this.idMap.set(player.getId(), newPlayer);
    player.addListener('disconnect', () => () => {
      this.removePlayer(newPlayer.getId());
    });
    return newPlayer;
  }

  removePlayer(id: string): Player {
    let removedPlayer: Player;
    removedPlayer = this.getPlayerById(id);
    this.players = this.players.filter((player) => {
      return player.getId() !== removedPlayer.getId();
    });
    this.idMap.delete(id);
    removedPlayer.socket.removeAllListeners();
    removedPlayer.disconnect(); // TODO: does this throw if already disconnected?
    return removedPlayer;
  }

  getIds(): string[] {
    return this.players.map((player) => {
      return player.getId();
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
    throw Error('player does not exist!');
  }

  addListener(id: string, eventName: string, fn: ListenerFactoryPlayer): void {
    let player = this.getPlayerById(id)
    player.addListener(eventName, fn(player));
  }

  removeListener(id: string, eventName: string): void {
    this.getPlayerById(id).removeListener(eventName);
  }

  addListenerToAll(eventName: string, fn: ListenerFactoryPlayer): void {
    this.players.forEach((player) => player.addListener(eventName, fn(player)));
  }

  removeListenerFromAll(eventName: string): void {
    this.players.forEach((player) => player.removeListener(eventName));
  }

  close(): void {
    this.idMap.clear();
    this.players.forEach((player => {
      player.disconnect();
    }));
    this.players = [];
  }
}