import { GameEvent, GameResponse } from "../types/types";
import { Coord, SantoriniGame } from "./santorini";

let santorini = new SantoriniGame('p1', 'p2');

console.log(santorini.coordsAreEqual({x: 1, y: 1}, {x: 1, y: 1}));
console.log(santorini.coordsAreEqual({x: 1, y: 1}, {x: 1, y: 2}));
console.log(santorini.coordsAreEqual({x: 3, y: 2}, {x: 3, y: 2}));
console.log(santorini.coordsAreEqual({x: 1, y: 2}, {x: 1, y: 1}));

console.log(santorini.distBetweenCoords({x: 1, y: 1}, {x: 1, y: 1}));
console.log(santorini.distBetweenCoords({x: 1, y: 0}, {x: 1, y: 1}));
console.log(santorini.distBetweenCoords({x: 1, y: 1}, {x: 0, y: 2}));
console.log(santorini.distBetweenCoords({x: 2, y: 2}, {x: 3, y: 3}));
console.log(santorini.distBetweenCoords({x: 1, y: 2}, {x: 1, y: 5}));

function renderResponse(board: number[], workers: Coord[]) {
  let prettyBoard: string[][] = [];
  for (let i = 0; i < 5; i++) {
    prettyBoard.push([]);
    for (let j = 0; j < 5; j++) {
      prettyBoard[i].push('' + board[i*5 + j]);
    }
  }
  workers.forEach((worker, index) => {
    if (index <= 1) prettyBoard[worker.y][worker.x] += 'R';
    else prettyBoard[worker.y][worker.x] += 'B';
  })
  return prettyBoard
}



let response: GameResponse;
let event: GameEvent
event = { type: 'placement', id: 'p1', payload: { coord: { x: 1, y: 1 } }, acknowledger: () => { } }
response = santorini.placeWorker(event);
console.log(response);
console.log(response.payload);

// // not your turn error
// event = { type: 'placement', id: 'p1', payload: { coord: { x: 1, y: 1 } }, acknowledger: () => { } }
// response = santorini.placeWorker(event);
// console.log(response);

// // coord occupied error
// event = { type: 'placement', id: 'p2', payload: { coord: { x: 1, y: 1 } }, acknowledger: () => { } }
// response = santorini.placeWorker(event);
// console.log(response);

event = { type: 'placement', id: 'p2', payload: { coord: { x: 1, y: 2 } }, acknowledger: () => { } }
response = santorini.placeWorker(event);
console.log(response);

event = { type: 'placement', id: 'p2', payload: { coord: { x: 1, y: 3 } }, acknowledger: () => { } }
response = santorini.placeWorker(event);
console.log(response);

event = { type: 'placement', id: 'p1', payload: { coord: { x: 4, y: 1 } }, acknowledger: () => { } }
response = santorini.placeWorker(event);
console.log(response);
console.log(response.payload.workers);

console.log(renderResponse(response.payload.board, response.payload.workers));

let payload: any = {
  originCoord: {x: 1, y: 1},
  moveCoord: {x: 2, y: 1},
  buildCoord: {x: 1, y: 1},
}
event = { type: 'placement', id: 'p1', payload, acknowledger: () => { } }
response = santorini.makeMove(event);
console.log(renderResponse(response.payload.board, response.payload.workers));
