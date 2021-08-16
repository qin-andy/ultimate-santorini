import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";
import { ListenerFactoryRoom, Listener } from "../types/types";

export const roomNameListener: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (data?: any): void => {
        if (!player) { throw Error('no player!') }
        console.log(room.getRoomName());
      }
    }
  },
  eventName: 'room name'
}

/*
  Adds a listener to a player's socket on the event 'mirror'
  upon which the player will emit to all connected clients
*/

export const mirrorListener: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (data?: any): void => {
        if (!player) { throw Error('no player!') }
        player.socket.emit('mirror', data);
      }
    }
  },
  eventName: 'mirror'
}