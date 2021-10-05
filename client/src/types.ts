export type marking = 'x' | 'o' | '*';

export interface GameEvent {
  type: string,
  payload: any,
  id: string,
  acknowledger: Function
}

export interface GameResponse {
  error: boolean,
  payload: any,
  type: string,
  message: string
}

export interface ManagerEvent {
  type: string,
  payload: any,
  id: string,
  acknowledger: Function
}

export interface ManagerResponse {
  error: boolean,
  payload: any,
  type: string,
  message: string
}

export interface SelectionState {
  phase: string,
  selectedWorker: number,
  selectedMove: number,
  highlightBuilds: boolean,
  highlightMoves: boolean
}

export interface SantoriniState {
  player: 'red' | 'blue' | '',
  board: number[],
  workers: Coord[]
  turn: 'red' | 'blue',
  phase: 'pregame' | 'placement' | 'build' | 'postgame',
  winner: 'red' | 'blue' | '',
  winningCoord: Coord
}

export interface SquareData {
  index: number,
  coord: Coord,
  worker: '' | 'red' | 'blue',
  workerId: number,
  elevation: number,
  moveHighlighted: boolean,
  buildHighlighted: boolean,
  isWinningCoord: boolean
}

export type Coord = { x: number, y: number };