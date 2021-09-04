import { Player } from "./player";

export class PlayerManager {
  playerMap: Map<string, Player>;

  constructor() {
    this.playerMap = new Map<string, Player>();
  }

  addPlayer(player: Player): Player {
    if (this.playerMap.has(player.id)) throw Error('Player already exists!');

    this.playerMap.set(player.id, player);
    player.socket.on('disconnect', () => {
      this.removePlayer(player.id);
    });
    return player;
  }

  removePlayer(id: string): Player {
    let removedPlayer: Player;
    removedPlayer = this.getPlayerById(id);
    this.playerMap.delete(id);
    removedPlayer.socket.removeAllListeners();
    removedPlayer.socket.disconnect();
    return removedPlayer;
  }

  getIds(): string[] {
    return Array.from(this.playerMap.keys());
  }

  getNames(): string[] {
    return Array.from(this.playerMap.values()).map((player) => {
      return player.name;
    });
  }

  getCount(): number {
    return this.playerMap.size;
  }

  getPlayerById(id: string): Player {
    let player = this.playerMap.get(id);
    if (player) {
      return player;
    }
    throw Error('player does not exist!');
  }

  close(): void {
    this.playerMap.forEach(player => {
      player.socket.disconnect();
    });
    this.playerMap.clear();
  }
}