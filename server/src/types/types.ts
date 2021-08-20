
import { Game } from "../game/game";
import { Player } from "../game/player";

export interface GameEvent {
  name: string,
  payload: any,
  id: string
}