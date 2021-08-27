
import { Game } from "../game/game";
import { Player } from "../game/player";

export interface GameEvent {
  name: string,
  payload: any,
  id: string,
  acknowledger: Function
}

export interface GameUpdate {
  payload: any,
  type: string,
  message: string
}

export interface GameError {
  payload: any,
  type: string,
  message: string
}