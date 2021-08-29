
import { Game } from "../game/game";
import { Player } from "../game/player";

export interface GameEvent {
  type: string,
  payload: any,
  id: string,
  acknowledger: Function
}

export interface GameResponse {
  error: boolean,
  payload: any,
  type: string,
  message: string
}