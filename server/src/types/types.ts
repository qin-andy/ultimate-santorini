
import { Game } from "../game/game";
import { Player } from "../player/player";

export interface GameEvent {
  type: string,
  payload: any,
  id: string,
}

export interface GameResponse {
  error: boolean,
  payload: any,
  type: string,
  message: string
}

export interface ManagerEvent {
  type: string,
  payload: any,
  id: string,
}

export interface ManagerResponse {
  error: boolean,
  payload: any,
  type: string,
  message: string
}

export type ManagerHandler = (event: ManagerEvent) => ManagerResponse;