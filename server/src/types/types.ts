import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";

export interface ChatMessage {
  from: string;
  date: Date;
  message: string;
}

export interface ListenerFactoryRoom {
  (room: Room): ListenerFactoryPlayer;
}

export interface ListenerFactoryPlayer {
  (player?: Player): (data?: any) => void;
}

export interface Listener {
  listenerFactory: ListenerFactoryRoom;
  eventName: string;
}