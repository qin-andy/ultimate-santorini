import { PlayerManager } from "./playerManager";
import { nanoid } from "nanoid";

export class Game {
  playerManager: PlayerManager;
  name: string;
  id: string;

  constructor(name: string) {
    this.name = name;
    this.playerManager = new PlayerManager();
    this.id = nanoid();
  }



  close() {
    this.playerManager.close();
  }
}