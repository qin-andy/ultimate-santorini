import React, { ReactElement, useEffect, useState } from 'react';

import socket, { getPlayerInfo, joinQueue, santoriniMove, santoriniPlace, santoriniStart, santoriniWinMove } from '../services/socket';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { GameResponse, ManagerResponse, marking } from '../types';
import './santorini.scss';
import { AnimateSharedLayout, motion } from 'framer-motion';

type Coord = { x: number, y: number };

const SantoriniPage = () => {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    socket.on('manager response', (response: ManagerResponse) => {
      console.log(response);
      if (response.type === 'player info') {
        dispatch({
          type: 'manager/playerInfoReceived',
          payload: response.payload
        });
        dispatch({
          type: 'tictactoe/playerInfoReceived',
          payload: response.payload
        });
      }
      dispatch({ type: 'manager/managerResponseReceived', payload: response });
    });

    socket.on('game update', (response: GameResponse) => {
      console.log(response);
      dispatch({ type: 'tictactoe/gameResponseReceived', payload: response });
      if (response.type === 'start success') {
        console.log('start receieved, dispatching action');
        let payload = { ...response.payload, playerColor: response.payload.players.red === socket.id ? 'red' : 'blue' };
        console.log(payload);
        dispatch({ type: 'santorini/santoriniStarted', payload: payload });
      } else if (response.type === 'placement update') {
        console.log('placement recieved');
        dispatch({ type: 'santorini/santoriniWorkerPlaced', payload: response.payload });
      } else if (response.type === 'santorini move') {
        console.log('move receieved');
        if (!response.error) dispatch({ type: 'santorini/santoriniMoved', payload: response.payload });
      } else if (response.type === 'santorini win') {
        console.log('move receieved');
        if (!response.error) {
          dispatch({ type: 'santorini/santoriniMoved', payload: response.payload });
          dispatch({ type: 'santorini/santoriniWon', payload: response.payload });
        }
      }
    });

    getPlayerInfo();
    timeouts.push(setTimeout(() => joinQueue(), 0));
    return () => {
      socket.off('game update')
      socket.off('manager response')
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className='my-row'>
      <button onClick={santoriniStart}>
        Start
      </button>
      <SantoriniBoard />
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

const SantoriniBoard = (props: {}) => {
  const [selectedWorker, setSelectedWorker] = useState(-1);
  const [selectedMove, setSelectedMove] = useState(-1);
  const [highlightMoves, setHighlightMoves] = useState(false);
  const [highlightBuilds, setHighlightBuilds] = useState(false);
  const [boardData, setBoardData] = useState<SquareData[]>([]);

  const elevations = useAppSelector(state => state.santorini.board);
  const phase = useAppSelector(state => state.santorini.phase);
  const workers = useAppSelector(state => state.santorini.workers);
  const turn = useAppSelector(state => state.santorini.turn);
  const winningCoord = useAppSelector(state => state.santorini.winningCoord);

  function indexToCoord(index: number): Coord {
    return { x: index % 5, y: Math.floor(index / 5) }
  }

  function sendAction(buildIndex: number) {
    let payload = {
      workerCoord: indexToCoord(selectedWorker),
      moveCoord: indexToCoord(selectedMove),
      buildCoord: indexToCoord(buildIndex)
    }
    santoriniMove(payload);
    console.log(payload);
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
    if (selectedWorker >= 0 && highlightMoves) {
      let adjacentIndexes = getAdjIndexes(selectedWorker);
      adjacentIndexes.forEach(index => {
        if (boardData[index].elevation - boardData[selectedWorker].elevation <= 1
          && boardData[index].worker === '') {
          boardData[index].moveHighlighted = true;
        }
      });
    }
    // highlight biulds
    if (selectedMove >= 0 && highlightBuilds) {
      boardData[selectedWorker].worker = '';
      let workerId = boardData[selectedWorker].workerId;
      boardData[selectedWorker].workerId = -1;
      boardData[selectedMove].worker = turn;
      boardData[selectedMove].workerId = workerId;
      let adjacentIndexes = getAdjIndexes(selectedMove);
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

  function updateBoardData() {
    setBoardData(generateBoardData());
  }

  useEffect(() => {
    if (boardData[selectedMove]?.elevation === 3) santoriniWinMove({
      moveCoord: indexToCoord(selectedMove), workerCoord: indexToCoord(selectedWorker)
    });
    updateBoardData();
  }, [elevations, phase, workers, turn, selectedWorker, selectedMove, highlightBuilds, highlightMoves]);

  useEffect(() => {
    setHighlightMoves(false);
    setHighlightBuilds(false);
    setSelectedMove(-1);
    setSelectedWorker(-1);
  }, [workers])

  let boardSquares = boardData.map(squareData => {
    return (
      <SantoriniSquare
        key={squareData.index}
        index={squareData.index}
        elevation={squareData.elevation}
        worker={squareData.worker}
        workerId={squareData.workerId}
        phase={phase}
        moveHighlighted={squareData.moveHighlighted}
        buildHighlighted={squareData.buildHighlighted}
        highlightBuilds={highlightBuilds}
        highlightMoves={highlightMoves}
        setSelectedWorker={setSelectedWorker}
        setSelectedMove={setSelectedMove}
        setHighlightBuilds={setHighlightBuilds}
        setHighlightMoves={setHighlightMoves}
        sendAction={sendAction}
        updateBoardData={updateBoardData}
        isWinningCoord={squareData.isWinningCoord}
      />
    );
  });

  return (
    <AnimateSharedLayout>
      <div className='santorini-grid' style={{
        display: `grid`,
        gridTemplateColumns: `repeat(5, 1fr)`
      }}>
        {boardSquares}
      </div>
    </AnimateSharedLayout>
  )
}

const SantoriniSquare = (props: {
  index: number,
  elevation: number,
  worker: string,
  workerId: number,
  phase: string,
  moveHighlighted: boolean,
  buildHighlighted: boolean,
  setSelectedWorker: Function,
  setSelectedMove: Function,
  setHighlightBuilds: Function,
  setHighlightMoves: Function,
  sendAction: Function,
  highlightBuilds: boolean,
  highlightMoves: boolean,
  updateBoardData: Function,
  isWinningCoord: boolean
}) => {
  // TODO : raise props
  const turn = useAppSelector(state => state.santorini.turn);
  const player = useAppSelector(state => state.santorini.player);
  const isPlayerTurn = turn === player;
  function indexToCoord(index: number): Coord {
    return { x: index % 5, y: Math.floor(index / 5) }
  }

  function onclick() {
    switch (props.phase) {
      case 'placement':
        console.log('sending placement request');
        santoriniPlace({ coord: indexToCoord(props.index) });
        break;
      case 'build':
        if (isPlayerTurn) {
          if (props.worker === player && !props.highlightMoves && !props.highlightBuilds) {
            console.log('worker selected, showing moves');
            props.setHighlightMoves(true);
            props.setHighlightBuilds(false);
            props.setSelectedWorker(props.index);
          } else if (props.moveHighlighted && !props.worker) {
            console.log('move selected, showing builds');
            props.setHighlightMoves(false);
            props.setHighlightBuilds(true);
            props.setSelectedMove(props.index);
          } else if (props.buildHighlighted && !props.worker) {
            console.log('action dispatched');
            props.sendAction(props.index);
          } else {
            console.log('all deselected');
            props.setHighlightMoves(false);
            props.setHighlightBuilds(false);
            props.setSelectedMove(-1);
            props.setSelectedWorker(-1);
          }
        }
        break;
    }
  }

  let cellVariants = {
    default: {
      backgroundColor: '#FFFFFF',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    hover: {
      scale: 1,
      transition: {
        duration: 0.1
      }
    },
    popIn: {
      scale: 0.87,
      transition: {
        duration: 0.1
      }
    },
    moveHighlighted: {
      backgroundColor: '#DDDDDD',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
    buildHighlighted: {
      backgroundColor: '#CCCCCC',
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    },
  }

  let tappable = props.worker || (props.buildHighlighted && !props.worker) || (props.moveHighlighted && !props.worker);
  return (
    <motion.div
      className={'santorini-cell'}
      variants={cellVariants}
      whileHover={'hover'}
      whileTap={'popIn'}
      animate={props.moveHighlighted ? 'moveHighlighted' : props.buildHighlighted ? 'buildHighlighted' : 'default'}
      onClick={onclick}
      style={props.worker ? { zIndex: 3 } : {}}
    >
      <Building elevation={props.elevation}
        worker={props.worker}
        workerId={props.workerId}
        phase={props.phase}
        isWinningCoord={props.isWinningCoord}
        turn={turn}
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

export default SantoriniPage;