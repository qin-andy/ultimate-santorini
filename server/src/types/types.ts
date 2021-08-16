import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";

export interface ChatMessage {
  from: string;
  date: Date;
  message: string;
}



/*
  The Listener interface wraps all the relevant data that a
  Player class should have access to while registering and event handler
  to their server socket instance.

  It uses a nested factory pattern for dependency injection, i.e.
  the listenerFactory is a factory function which takes the room
  that the player is currently in. This first factory function
  creates a second factory which accepts a reference to the player
  themselves. This second factory is what produces the event handler
  itself so it can access both the Player and the Room the player is in
*/
export interface Listener {
  listenerFactory: ListenerFactoryRoom;
  eventName: string;
}

export interface ListenerFactoryRoom {
  (room: Room): ListenerFactoryPlayer;
}

export interface ListenerFactoryPlayer {
  (player?: Player): (data?: any) => void;
}