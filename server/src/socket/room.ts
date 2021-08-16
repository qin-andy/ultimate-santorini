import { Listener } from "../types/types";
import { Player, PlayerManager } from "./playerManager";

export class Room {
  name: string;
  playerManager: PlayerManager;
  host: Player | null;
  // TODO : settings json

  constructor(name: string, host?: Player) {
    this.name = name;
    this.playerManager = new PlayerManager();
    this.host = null;
  }

  addPlayer(player: Player): Player {
    if (!this.host) {
      this.host = player;
    }
    return this.playerManager.addPlayer(player);
  }

  removePlayer(id: string): Player {
    if (!this.host) {
      throw Error('No players left!');
    }
    let removedPlayer = this.playerManager.removePlayer(id);
    if (this.playerManager.getCount() === 0) {
      this.host = null;
    } else {
      this.host = this.playerManager.players[0];
    }
    return removedPlayer;
  }

  getPlayerNames(): string[] {
    return this.playerManager.players.map((player) => {
      return player.getName();
    });
  }

  getPlayerIds(): string[] {
    return this.playerManager.players.map((player) => {
      return player.getId();
    });
  }

  getRoomName(): string {
    return this.name;
  }

  getHost(): Player {
    if (this.host) {
      return this.host;
    }
    throw Error(`room ${this.name} has no host!`);
  }

  close(): void {
    this.playerManager.disconnectAll();
    this.playerManager = new PlayerManager();
    this.host = null;
  }

  addListenerToAll(listener: Listener): void {
    let { eventName, listenerFactory } = listener;
    this.playerManager.addListenerToAll(eventName, listenerFactory(this));
  }

  removeListenerFromAll(listener: Listener): void {
    let { eventName } = listener;
    this.playerManager.removeListenerFromAll(eventName);
  }
}