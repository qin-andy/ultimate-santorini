import { Player } from "./player";

export class PlayerManager {
  playerMap: Map<string, Player>;

  constructor() {
    this.playerMap = new Map<string, Player>();
  }

  addPlayer(player: Player): Player {
    if (this.playerMap.has(player.id)) throw Error('Player already exists!');
    this.playerMap.set(player.id, player);
    return player;
  }

  removePlayer(id: string) {
    let player: Player | undefined = undefined
    player = this.playerMap.get(id);
    this.playerMap.delete(id);
    return player;
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

  getPlayerById(id: string): Player | undefined {
    let player = this.playerMap.get(id);
    if (player) {
      return player;
    }
    return undefined;
  }

  close(): void {
    this.playerMap.clear();
  }
}