import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";
import { Listener } from "../types/types";


// acknowledgement, returns room name
export const roomNameAcknowledger: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (data?: any, notifier?: any): void => {
        notifier(room.getRoomName());
      }
    }
  },
  eventName: 'get room name'
}

// acknowledgement, returns players list
export const getPlayerListAcknowledger: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (data?: any, notifier?: any): void => {
        notifier(room.getPlayerNames());
      }
    }
  },
  eventName: 'get player list'
}

// listener, updates name changes
export const playerListListener: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (data?: any, notifier?: any): void => {
        if (player && data && typeof data === 'string') {
          player.displayName = data;
        }
      }
    }
  },
  eventName: 'name change'
}