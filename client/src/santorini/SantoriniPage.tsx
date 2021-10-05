import React, { Reducer, useEffect, useReducer, useState } from 'react';
import './santorini.scss';

import socket, { getPlayerInfo, joinBotGame, joinQueue, santoriniMove, santoriniPlace, santoriniWinMove } from '../services/socket';
import { GameResponse, ManagerResponse } from '../types';
import { AnimatePresence, AnimateSharedLayout, motion } from 'framer-motion';

type Coord = { x: number, y: number };

interface SantoriniSlice {
  player: 'red' | 'blue' | '',
  board: number[],
  workers: Coord[]
  turn: 'red' | 'blue',
  phase: 'pregame' | 'placement' | 'build' | 'postgame',
  winner: 'red' | 'blue' | '',
  winningCoord: Coord
}

const SantoriniPage = () => {

  const initialState: SantoriniSlice = {
    player: '',
    board: [0],
    workers: [],
    turn: 'red',
    phase: 'pregame',
    winner: '',
    winningCoord: { x: -1, y: -1 }
  }

  const reducer: Reducer<SantoriniSlice, any> = (state: SantoriniSlice, action: any) => {
    let newState: SantoriniSlice;
    switch (action.type) {
      case 'start':
        newState = {
          ...state,
          phase: 'placement',
          board: action.payload.board,
          workers: action.payload.workers,
          turn: 'red',
          player: action.payload.playerColor,
        }
        return newState;
      case 'placement':
        newState = {
          ...state,
          board: action.payload.board,
          workers: action.payload.workers,
          turn: action.payload.turn,
        }
        if (action.payload.done) newState.phase = 'build';
        return newState;
      case 'move':
        newState = {
          ...state,
          board: action.payload.board,
          workers: action.payload.workers,
          turn: action.payload.turn,
        }
        return newState;
      case 'won':
        newState = {
          ...state,
          winner: action.payload.winner,
          winningCoord: action.payload.winningCoord,
          phase: 'postgame',
        }
        return newState;
      case 'reset':
        newState = {
          ...state,
          phase: 'pregame'
        }
        return newState;
    }
    return state;
  }

  const [gameState, gameDispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    socket.on('manager response', (response: ManagerResponse) => {
      console.log(response);
    });

    socket.on('game update', (response: GameResponse) => {
      console.log(response);
      if (response.type === 'start success') {
        console.log('start receieved, dispatching action');
        let payload = { ...response.payload, playerColor: response.payload.players.red === socket.id ? 'red' : 'blue' };
        gameDispatch({ type: 'start', payload: payload });
      } else if (response.type === 'placement update') {
        console.log('placement recieved');
        gameDispatch({ type: 'placement', payload: response.payload });
      } else if (response.type === 'santorini move') {
        console.log('move receieved');
        if (!response.error) gameDispatch({ type: 'move', payload: response.payload });
      } else if (response.type === 'santorini win') {
        console.log('move receieved');
        if (!response.error) {
          gameDispatch({ type: 'move', payload: response.payload });
          gameDispatch({ type: 'won', payload: response.payload });
        }
      } else if (response.type === 'win disconnect') {
        timeouts.push(setTimeout(() => {
          // autorejoin queue after 
          // dispatch({ type: 'santorini/santoriniReset', payload: {} });
          // joinQueue();
        }, 1000));
      }
    });

    getPlayerInfo();
    // timeouts.push(setTimeout(() => joinQueue(), 0)); // auto join queue on page load
    return () => {
      socket.off('game update')
      socket.off('manager response')
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className='my-row'>
      <SantoriniBoard state={gameState} />
    </div>
  );
}

interface SquareData {
  index: number,
  coord: Coord,
  worker: '' | 'red' | 'blue',
  workerId: number,
  elevation: number,
  moveHighlighted: boolean,
  buildHighlighted: boolean,
  isWinningCoord: boolean
}

const SantoriniBoard = (props: { state: SantoriniSlice }) => {
  const [boardData, setBoardData] = useState<SquareData[]>([]); // for finer tuned control of rerenders
  const [showButtons, setShowButtons] = useState(true);

  const elevations = props.state.board;
  const phase = props.state.phase;
  const workers = props.state.workers;
  const turn = props.state.turn;
  const winningCoord = props.state.winningCoord;
  const player = props.state.player;

  interface SelectionState {
    phase: string,
    selectedWorker: number,
    selectedMove: number,
    highlightBuilds: boolean,
    highlightMoves: boolean
  }

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

const SantoriniSquare = (props: {
  index: number,
  elevation: number,
  worker: string,
  workerId: number,
  phase: string,
  player: string,
  turn: string,
  selectionDispatch: Function,
  moveHighlighted: boolean,
  buildHighlighted: boolean,
  highlightBuilds: boolean,
  highlightMoves: boolean,
  isWinningCoord: boolean
}) => {
  const [variant, setVariant] = useState('initial');
  const isPlayerTurn = props.turn === props.player;
  function indexToCoord(index: number): Coord {
    return { x: index % 5, y: Math.floor(index / 5) }
  }

  function onClick() {
    switch (props.phase) {
      case 'placement':
        console.log('sending placement request');
        santoriniPlace({ coord: indexToCoord(props.index) });
        break;
      case 'build':
        if (isPlayerTurn) {
          // if there is a worker on this space and nothing else is highlighted
          if (props.worker === props.player && !props.highlightMoves && !props.highlightBuilds) {
            props.selectionDispatch({ type: 'select worker', coord: props.index });
          } else if (props.moveHighlighted && !props.worker) {
            props.selectionDispatch({ type: 'select move', coord: props.index });
          } else if (props.buildHighlighted && !props.worker) {
            props.selectionDispatch({ type: 'select build', coord: props.index });
          } else {
            props.selectionDispatch({ type: 'deselect all' });
          }
        }
        break;
    }
  }

  let delay = props.index * 0.05;
  let cellVariants = {
    beforeEnter: {
      opacity: 0, x: 0, y: 100,
      scale: 0.9,
    },
    initial: {
      opacity: 1, x: 0, y: 0,
      scale: 0.9,
      transition: {
        type: 'spring',
        bounce: 0.25,
        duration: 1,
        delay: delay
      }
    },
    default: {
      x: 0, y: 0, opacity: 1,
      backgroundColor: '#FFFFFF',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    hover: {
      x: 0, y: 0, opacity: 1,
      scale: 1,
      transition: {
        duration: 0.1
      }
    },
    popIn: {
      x: 0, y: 0, opacity: 1,
      scale: 0.87,
      transition: {
        duration: 0.1
      }
    },
    moveHighlighted: {
      x: 0, y: 0, opacity: 1,
      backgroundColor: '#DDDDDD',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    buildHighlighted: {
      x: 0, y: 0, opacity: 1,
      backgroundColor: '#CCCCCC',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    exit: {
      x: 0, y: 100, opacity: 0,
      transition: {
        duration: 0.5,
        delay: delay
      }
    }
  }

  return (
    <motion.div
      className={'santorini-cell'}
      variants={cellVariants}
      animate={props.moveHighlighted ? 'moveHighlighted' : props.buildHighlighted ? 'buildHighlighted' : variant}
      initial='beforeEnter'
      whileHover={variant === 'default' ? 'hover' : ''}
      whileTap={variant === 'default' ? 'popIn' : ''}
      onClick={onClick}
      onAnimationComplete={() => setVariant('default')}
      exit='exit'
      style={props.worker ? { zIndex: 3 } : {}}
    >
      <Building elevation={props.elevation}
        worker={props.worker}
        workerId={props.workerId}
        phase={props.phase}
        isWinningCoord={props.isWinningCoord}
        turn={props.turn}
      />
    </motion.div>
  )
}

const Building = (props: {
  elevation: number,
  worker: string,
  workerId: number,
  phase: string,
  turn: string,
  isWinningCoord: boolean,
}) => {
  let buildingVariants = {
    initial: {
      scale: 0
    },
    default: {
      scale: 1,
      transition: {
        type: 'spring',
        bounce: 0.5,
        duration: 0.75
      }
    },
    winning: {
      rotate: 360,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1.5,
        repeat: Infinity,
        type: 'spring',
        bounce: 0.5
      }
    }
  }

  let child = <div></div>;
  if (props.worker) child = <motion.div
    variants={buildingVariants}
    initial={props.phase === 'placement' ? 'initial' : 'default'} // animation should trigger after phase change
    animate={props.isWinningCoord ? 'winning' : 'default'}
    layoutId={'worker-' + props.workerId}
    className={'worker-' + props.worker}
  />
  if (props.elevation >= 4) child = <motion.img
    src='x.svg'
    alt='capped tower'
    variants={buildingVariants}
    initial='initial'
    animate='default'
    className='elevation-4'>
  </motion.img>
  if (props.elevation >= 3) child = <motion.div
    variants={buildingVariants}
    initial='initial'
    animate={props.isWinningCoord ? 'winning' : 'default'}
    className='elevation-3'>
    {child}
  </motion.div>
  if (props.elevation >= 2) child = <motion.div
    variants={buildingVariants}
    initial='initial'
    animate={props.isWinningCoord ? 'winning' : 'default'}
    className='elevation-2'>
    {child}
  </motion.div>
  if (props.elevation >= 1) child = <motion.div
    variants={buildingVariants}
    initial='initial'
    animate={props.isWinningCoord ? 'winning' : 'default'}
    className='elevation-1'>
    {child}
  </motion.div>
  return child;
}

const MenuButton = (props: { onClick: any, text: string }) => {
  let buttonVariants = {
    initial: {
      opacity: 1,
      transition: {
        duration: 1
      }
    },
    show: {
      opacity: 1,
      transition: {
        duration: 1
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 1
      }
    }
  }

  return (
    <motion.button
      layout
      className=""
      onClick={props.onClick}
      variants={buttonVariants}
      initial='initial'
      animate='show'
      exit='exit'
    >
      {props.text}
    </motion.button>
  )
}

export default SantoriniPage;