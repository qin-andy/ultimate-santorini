import { Game } from "./game";

export class EventHandler {
  game: Game;
  eventMap: Map<string, Function>
  constructor(game: Game) {
    this.game = game;
    this.eventMap = new Map<string, Function>();
    this.initializeHandlers();
  }

  initializeHandlers() {
    /*
      Questions to Consider, Design wise:
        1. What is the structure of Event?
          - socket: the server socket from which the the event was recieved from
          - payload: the data itself
          - ??? What other information would be useful? the game state? timestamp?
        2. What is the structure of Payload?
          - Could be standardized or freeform (any)
        3. Should acknowledgers be standardized? Should every request be acknowledged?
          - Pros: Simplifies error handling, standardizes handler management
            - Could include info such as "succeeded" or "failed" in addition to relevant info
          - Cons: More bandwidth? adds more overhead in sending more data
            - is that a real concern though?
        4.
    */
    const handleListPlayers = (event: any, acknowledger: Function) => {
      acknowledger(this.game.playerManager.getNames());
    }

    const handleChangeName = (event: any) {
      let player = this.game.playerManager.getPlayerById(event.socket.id);
      player.name = event.name;
    }

    this.eventMap.set('get player list', handleListPlayers);
    this.eventMap.set('set player name', handleChangeName);
  }

  handleEvent(event: any, acknowledger: Function) {
    let handler = this.eventMap.get(event.event)
    if (handler) {
      handler(event, acknowledger);
    }
  }
}