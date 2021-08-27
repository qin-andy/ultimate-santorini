
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
  code: number
}

export interface Error {
  payload: any,
  code: number,
  name: string,
  message: string
}