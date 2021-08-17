import { Handler } from "../types/types";
import { Game } from "./game";
import { Player } from "./player";

export class HandlerManager {
  game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  addHandler(player: Player, handler: Handler) {
    player.socket.on(handler.eventName, handler.handlerFactory(this.game));
  }

  removeHandler(player: Player, handler: Handler) {
    player.socket.removeAllListeners(handler.eventName);
  }

  addHandlerToAll(handler: Handler) {
    this.game.playerManager.players.forEach((player) => {
      player.socket.on(handler.eventName, handler.handlerFactory(this.game));
    });
  }

  removeHandlerFromAll(handler: Handler) {
    this.game.playerManager.players.forEach((player) => {
      player.socket.removeAllListeners(handler.eventName);
    });
  }
}