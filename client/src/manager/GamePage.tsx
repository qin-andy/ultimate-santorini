import React, { useEffect, useState } from 'react';
import { Col, Row, Container } from 'react-bootstrap';

import socket, { getPlayerInfo, joinQueue, leaveGame } from '../services/socket';
import Board from '../tictactoe/Board';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { GameResponse, ManagerResponse, marking } from '../types';
import { motion, AnimateSharedLayout } from 'framer-motion';

const GamePage = () => {
  const dispatch = useAppDispatch();
  const running = useAppSelector(state => state.tictactoe.running);
  const turn = useAppSelector(state => state.tictactoe.turn);
  const board: marking[] = useAppSelector(state => state.tictactoe.board);
  const dimensions = useAppSelector(state => state.tictactoe.dimensions)

  const [showBoard, setShowBoard] = useState(false);

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
      if (response.type === 'start success' || response.type === 'reset success') {
        let board: marking[] = new Array<marking>(response.payload.size.x * response.payload.size.y);
        board.fill('*');
        let payload = {
          x: response.payload.size.x, y: response.payload.size.y, board,
          o: response.payload.o, turn: response.payload.turn
        }
        dispatch({ type: 'tictactoe/gameStarted', payload });
      } else if (response.type === 'mark') {
        dispatch({
          type: 'tictactoe/boardUpdated', payload: {
            board: response.payload.board,
            turn: response.payload.turn
          }
        });
      } else if (response.type === 'win') {
        dispatch({
          type: 'tictactoe/gameWon', payload: {
            winner: response.payload.winner,
            board: response.payload.board,
            winningMark: response.payload.mark,
            winningSquares: response.payload.winningSquares
          }
        });
      } else if (response.type === 'tie') {
        dispatch({
          type: 'tictactoe/gameTied', payload: {
            board: response.payload.board
          }
        });
      } else if (response.type === 'win disconnect') {
        leaveGame();
        timeouts.push(setTimeout(async () => joinQueue(), 2000));
        dispatch({
          type: 'tictactoe/opponentDisconnect', payload: {}
        });
      }
    });

    getPlayerInfo();
    timeouts.push(setTimeout(() => joinQueue(), 3000));
    return () => {
      socket.off('game update')
      socket.off('manager response')
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (running) {
      setShowBoard(true);
    } else if (!running) {
      timeout = setTimeout(() => setShowBoard(false), 1500);
    }
    return () => clearTimeout(timeout);
  }, [running]);

  const markingVariants = {
    marked: {
      opacity: 1, scale: 0.5, rotate: 0,
      transition: {
        repeat: 0,
        type: 'spring',
        bounce: 0.5,
        duration: 0.5
      }
    },
    unmarked: {
      opacity: 0, scale: 0.3, rotate: 25,
      transition: {
        duration: 0.2
      }
    },
    winningSquare: {
      rotate: 360,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 1,
        type: 'spring',
        bounce: 0.5
      }
    }
  }

  return (
    <Container fluid className='w-100 d-flex flex-column justify-content-center align-items-center'>
      <Row className='w-75 d-flex flex-row justify-content-center align-items-center'>
        <Col className='d-flex w-50 flex-row align-items-center justify-content-around text-center'>
          <AnimateSharedLayout>
            <motion.img
              className='cell-mark'
              key='svg image 1'
              variants={markingVariants}
              initial={'unmarked'}
              animate={turn === 'o' && running ? 'winningSquare' : 'marked'}
              exit={'unmarked'}
              src={`o.svg`}
              alt={'o'}
              layout
            />
            <Board dimensions={{ x: dimensions.x , y: dimensions.y }} board={board} active={showBoard} />
            <motion.img
              className='cell-mark'
              key='svg image 2'
              variants={markingVariants}
              initial={'unmarked'}
              animate={turn === 'x' && running ? 'winningSquare' : 'marked'}
              exit={'unmarked'}
              src={`x.svg`}
              alt={'x'}
              layout
            />
          </AnimateSharedLayout>
        </Col>
      </Row>
    </Container >
  );
}

export default GamePage;