import { Player } from "../socket/playerManager";
import { Room } from "../socket/room";
import { Listener } from "../types/types";

export const mirrorListener: Listener = {
  listenerFactory: (room: Room) => {
    return (player?: Player) => {
      return (message: string, notifier?: any): void => {
        notifier(message);
      }
    }
  },
  eventName: 'mirror'
}