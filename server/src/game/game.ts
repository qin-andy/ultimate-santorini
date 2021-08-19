import { PlayerManager } from "./playerManager";
import { nanoid } from "nanoid";
import { Player } from "./player";
import { EventHandler } from "./eventHandler";

export class Game {
  playerManager: PlayerManager;
  eventHandler: EventHandler;
  name: string;
  id: string;

  constructor(name: string) {
    this.name = name;
    this.playerManager = new PlayerManager();
    this.eventHandler = new EventHandler(this);
    this.id = nanoid();
  }

  addPlayer(player: Player) {
    player.socket.on('game action', this.eventHandler.handleEvent);
    this.playerManager.addPlayer(player);
  }

  removePlayer(player: Player) {
    return this.playerManager.removePlayer(player.id);
  }

  close() {
    this.playerManager.close();
  }
}