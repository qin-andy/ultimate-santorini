import { AnimatePresence, AnimateSharedLayout, motion } from "framer-motion";
import { Reducer, useEffect, useReducer, useState } from "react";
import { joinBotGame, joinQueue, santoriniMove, santoriniWinMove } from "../services/socket";
import { SantoriniState, SquareData, SelectionState, Coord } from "../types";
import { MenuButton } from "./MenuButton";
import { SantoriniSquare } from "./SantoriniSquare";

export const SantoriniBoard = (props: { state: SantoriniState }) => {
  const [boardData, setBoardData] = useState<SquareData[]>([]); // for finer tuned control of rerenders
  const [showButtons, setShowButtons] = useState(true);

  const elevations = props.state.board;
  const phase = props.state.phase;
  const workers = props.state.workers;
  const turn = props.state.turn;
  const winningCoord = props.state.winningCoord;
  const player = props.state.player;

  let initialSelectionState = {
    phase: 'select worker',
    selectedWorker: -1,
    selectedMove: -1,
    highlightBuilds: false,
    highlightMoves: false
  }

  const selectionReducer: Reducer<SelectionState, any> = (state: SelectionState, action: any) => {
    let newState: SelectionState;
    switch (action.type) {
      case 'select worker':
        newState = {
          ...state,
          phase: 'select move',
          highlightMoves: true,
          highlightBuilds: false,
          selectedWorker: action.coord
        }
        return newState;
      case 'select move':
        newState = {
          ...state,
          phase: 'select build',
          highlightMoves: true,
          highlightBuilds: false,
          selectedMove: action.coord
        }
        return newState;
      case 'select build':
        let payload = {
          workerCoord: indexToCoord(state.selectedWorker),
          moveCoord: indexToCoord(state.selectedMove),
          buildCoord: indexToCoord(action.coord)
        }
        santoriniMove(payload);

        return state;
      case 'deselect all':
        newState = {
          ...state,
          phase: 'select worker',
          highlightMoves: false,
          highlightBuilds: false,
          selectedWorker: -1,
          selectedMove: -1
        }
        return newState;
    }
    return state;
  }
  const [selectionState, selectionDispatch] = useReducer(selectionReducer, initialSelectionState);
  // emit with curernt selections
  function indexToCoord(index: number): Coord {
    return { x: index % 5, y: Math.floor(index / 5) }
  }

  // Build board data
  function generateBoardData() {
    let boardData: SquareData[] = [];

    function getAdjIndexes(index: number): number[] {
      let coord = { x: index % 5, y: Math.floor(index / 5) }
      let adjacentIndexes: number[] = [];
      for (let i = -1; i < 2; i++) {
        for (let j = -1; j < 2; j++) {
          let x = coord.x + i;
          let y = coord.y + j;
          if (x >= 0 && x <= 4
            && y >= 0 && y <= 4
            && (x + y * 5 !== index)) {
            adjacentIndexes.push(x + y * 5);
          }
        }
      }
      return adjacentIndexes;
    }

    for (let i = 0; i < 25; i++) {
      let squareData: SquareData = {
        index: i,
        coord: { x: i % 5, y: Math.floor(i / 5) },
        worker: '',
        workerId: -1,
        elevation: 0,
        moveHighlighted: false,
        buildHighlighted: false,
        isWinningCoord: false
      }
      boardData.push(squareData)
    }

    // populate elevation
    elevations.forEach((level, index) => {
      boardData[index].elevation = level;
    });

    // populate workers
    const workerIndexes = workers.map(coord => {
      return coord.x + coord.y * 5;
    });
    workerIndexes.forEach((i, index) => {
      if (i >= 0) {
        if (index <= 1) {
          boardData[i].worker = 'red'
        }
        else {
          boardData[i].worker = 'blue'
        }
        boardData[i].workerId = index;
      }
    });

    // highlight square around selected worker
    if (selectionState.phase === 'select move') {
      let adjacentIndexes = getAdjIndexes(selectionState.selectedWorker);
      adjacentIndexes.forEach(index => {
        if (boardData[index].elevation - boardData[selectionState.selectedWorker].elevation <= 1
          && boardData[index].worker === '') {
          boardData[index].moveHighlighted = true;
        }
      });
    }

    if (selectionState.phase === 'select build') {
      boardData[selectionState.selectedWorker].worker = '';
      let workerId = boardData[selectionState.selectedWorker].workerId;
      boardData[selectionState.selectedWorker].workerId = -1;
      boardData[selectionState.selectedMove].worker = turn;
      boardData[selectionState.selectedMove].workerId = workerId;
      let adjacentIndexes = getAdjIndexes(selectionState.selectedMove);
      adjacentIndexes.forEach(index => {
        if (boardData[index].worker === '' && boardData[index].elevation <= 3)
          boardData[index].buildHighlighted = true;
      });
    }

    //populate winning coord
    let winningIndex = winningCoord.x + winningCoord.y * 5;
    if (winningIndex >= 0) boardData[winningIndex].isWinningCoord = true;
    return boardData;
  }

  useEffect(() => selectionDispatch({ type: 'deselect all' }), [workers]);
  useEffect(() => {
    if (boardData[selectionState.selectedMove]?.elevation === 3) santoriniWinMove({
      moveCoord: indexToCoord(selectionState.selectedMove), workerCoord: indexToCoord(selectionState.selectedWorker)
    });
    // updateBoardData();
  },
    [elevations, phase, workers, turn,
      selectionState.selectedWorker, selectionState.selectedMove,
      selectionState.highlightBuilds, selectionState.highlightMoves]);

  let boardSquares = generateBoardData().map(squareData => {
    return (
      <SantoriniSquare
        key={squareData.index}
        index={squareData.index}
        elevation={squareData.elevation}
        worker={squareData.worker}
        workerId={squareData.workerId}
        phase={phase}
        player={player}
        turn={turn}
        selectionDispatch={selectionDispatch}
        moveHighlighted={squareData.moveHighlighted}
        buildHighlighted={squareData.buildHighlighted}
        highlightBuilds={selectionState.highlightBuilds}
        highlightMoves={selectionState.highlightMoves}
        isWinningCoord={squareData.isWinningCoord}
      />
    );
  });

  return (
    <div>
      <AnimateSharedLayout>
        <AnimatePresence>
          {showButtons ?
            <MenuButton
              text='Matchmaking Queue'
              key="1"
              onClick={() => {
                joinQueue();
                setShowButtons(false);
              }}
            /> : null}
          {showButtons ?
            <MenuButton
              text='Play against Bot'
              key="2"
              onClick={() => {
                joinBotGame();
                setShowButtons(false);
              }}
            /> : null}
        </AnimatePresence>
        <motion.div layout className='santorini-grid' style={{
          display: `grid`,
          gridTemplateColumns: `repeat(5, 1fr)`
        }}>
          <AnimatePresence>
            {phase === 'pregame' ? null : boardSquares}
          </AnimatePresence>
        </motion.div>
      </AnimateSharedLayout>
    </div>
  )
}