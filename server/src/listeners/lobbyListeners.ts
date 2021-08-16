import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";
import { ListenerFactoryRoom, Listener } from "../types/types";


const roomInfoFactory: ListenerFactoryRoom = (room: Room) => {
  return (player?: Player) => {
    return (data?: any): void => {
      if (!player) { throw Error('no player!') }
      console.log(room.getRoomName());
    }
  }
}

export const roomInfoListener: Listener = {
  listenerFactory: roomInfoFactory,
  eventName: 'info'
}

const mirrorFactory: ListenerFactoryRoom = (room: Room) => {
  return (player?: Player) => {
    return (data?: any): void => {
      if (!player) { throw Error('no player!') }
      player.socket.emit('mirror', data);
    }
  }
}

export const mirrorListener: Listener = {
  listenerFactory: mirrorFactory,
  eventName: 'mirror'
}