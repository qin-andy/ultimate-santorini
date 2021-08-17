
import { Game } from "../game/game";
import { Player } from "../game/player";


export interface Handler {
  handlerFactory: (game: Game, player?: Player) => {
    (...args: any): void;
  },
  eventName: string;
}