import { Player } from "./player";

export class PlayerManager {
  players: Player[];
  playerMap: Map<string, Player>;

  constructor() {
    this.players = [];
    this.playerMap = new Map<string, Player>();
  }

  addPlayer(player: Player): Player {
    if (this.players.includes(player)) throw Error('Player already exists!');
    this.players.push(player);

    this.playerMap.set(player.id, player);
    player.socket.on('disconnect', () => () => {
      this.removePlayer(player.id);
    });
    return player;
  }

  removePlayer(id: string): Player {
    let removedPlayer: Player;
    removedPlayer = this.getPlayerById(id);
    this.players = this.players.filter((player) => {
      return player.id !== removedPlayer.id;
    });
    this.playerMap.delete(id);
    removedPlayer.socket.removeAllListeners();
    removedPlayer.socket.disconnect();
    return removedPlayer;
  }

  getIds(): string[] {
    return this.players.map((player) => {
      return player.id;
    });
  }

  getNames(): string[] {
    return this.players.map((player) => {
      return player.name;
    });
  }

  getCount(): number {
    return this.players.length;
  }

  getPlayerById(id: string): Player {
    let player = this.playerMap.get(id);
    if (player) {
      return player;
    }
    throw Error('player does not exist!');
  }

  close(): void {
    this.playerMap.clear();
    this.players.forEach((player => {
      player.socket.disconnect();
    }));
    this.players = [];
  }
}