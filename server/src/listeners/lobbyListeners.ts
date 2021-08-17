import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";
import { Listener } from "../types/types";


export const roomNameAcknowledger: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (data?: any, notifier?: any): void => {
        notifier(room.getRoomName());
      }
    }
  },
  eventName: 'room name'
}