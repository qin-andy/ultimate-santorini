import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";
import { ListenerFactoryRoom, Listener } from "../types/types";

export const roomInfoListener: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (data?: any): void => {
        if (!player) { throw Error('no player!') }
        console.log(room.getRoomName());
      }
    }
  },
  eventName: 'info'
}

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