import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Form, ListGroup, Row, Container } from 'react-bootstrap';

import socket, { createGame, getPlayerInfo, joinGame, joinQueue, leaveGame, tictactoeStart } from '../services/socket';
import Board from '../tictactoe/Board';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { GameResponse, ManagerResponse, marking } from '../types';
import { motion, AnimateSharedLayout } from 'framer-motion';

const GamePage = () => {
  const dispatch = useAppDispatch();
  const board: marking[] = useAppSelector(state => state.tictactoe.board);

  useEffect(() => {
    // Routing listeners to store updates
    socket.on('game update', (response: GameResponse) => {
      console.log(response);
      dispatch({ type: 'tictactoe/gameResponseReceived', payload: response })
      if (response.type === 'start success' || response.type === 'reset success') {
        let board: marking[] = new Array<marking>(response.payload.size.x * response.payload.size.y);
        board.fill('*');
        let payload = { x: response.payload.size.x, y: response.payload.size.y, board }
        dispatch({ type: 'tictactoe/gameStarted', payload });
      } else if (response.type === 'mark') {
        dispatch({ type: 'tictactoe/boardUpdated', payload: response.payload.board });
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
        })
      }
    });

    socket.on('manager response', (response: ManagerResponse) => {
      console.log(response);

      if (response.type === 'player info') dispatch({
        type: 'manager/playerInfoReceived',
        payload: response.payload
      });
      else dispatch({ type: 'manager/managerResponseReceived', payload: response });
    });

    joinQueue();

    return () => {
      socket.off('game update')
      socket.off('manager response')
    };
  }, []);
  

  return (
    <Container fluid className='w-100 d-flex flex-column justify-content-center'>
      <Row className='w-100 d-flex flex-row align-items-center'>
        <Col className='p-2 d-flex flex-column align-items-center text-center'>
          <AnimateSharedLayout>
            <Board dimensions={{ x: 3, y: 3 }} board={board} active={true} />
          </AnimateSharedLayout>
        </Col>
      </Row>
    </Container >
  );
}

export default GamePage;