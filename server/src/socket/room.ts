import { Socket } from "socket.io";
import { Player, PlayerManager } from "./playerManager";

export class Room {
  name: string;
  playerManager: PlayerManager;
  host: Player | null;
  state: string; // TODO: enum?
  // TODO : settings json

  constructor(name: string, host: Player) {
    this.name = name;
    this.playerManager = new PlayerManager();
    this.host = null;
    this.state = 'lobby';
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
    return this.playerManager.removePlayer(id);
  }

  updateState(state: string): void {
    this.state = state;
  }

  // TODO: attach new state listeners and remove previous ones on state change
  // TODO: update settings
  // TODO: display all current players
  // TODO: update current players display on name change
}