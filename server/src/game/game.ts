import { PlayerManager } from "./playerManager";
import { nanoid } from "nanoid";
import { HandlerManager } from "./handlerManager";

export class Game {
  playerManager: PlayerManager;
  handlerManager: HandlerManager;
  name: string;
  id: string;

  constructor(name: string) {
    this.name = name;
    this.playerManager = new PlayerManager();
    this.handlerManager = new HandlerManager(this);
    this.id = nanoid();
  }

  close() {
    this.playerManager.close();
  }
}