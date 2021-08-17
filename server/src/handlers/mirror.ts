import { Game } from "../game/game";
import { Player } from "../game/player";
import { Handler } from "../types/types";

export const mirrorAcknowledger: Handler = {
  handlerFactory: (game: Game) => (message: string, acknowledge: Function) => {
    acknowledge(message);
  },
  eventName: 'mirror'
}