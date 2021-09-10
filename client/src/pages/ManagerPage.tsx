import React, { useEffect } from 'react';
import { Button, Col, Row } from 'react-bootstrap';

import DefaultPage from './DefaultPage';
import socket, { createGame, joinGame, tictactoeStart } from '../services/socket';
import Board from '../tictactoe/Board';
import { useAppDispatch } from '../hooks/hooks';
import { GameResponse, marking } from '../types';

const ManagerPage = () => {
  // let gameResponse = useGameResponse(socket);

  const dispatch = useAppDispatch();
  useEffect(() => {
    socket.on('game update', (response: GameResponse) => {
      console.log(response);
      if (response.type === 'start success') {
        let board: marking[] = new Array<marking>(response.payload.x * response.payload.y);
        board.fill('*');
        let payload = { x: response.payload.x, y: response.payload.y, board }
        dispatch({ type: 'tictactoe/gameStarted', payload });
      } else if (response.type === 'mark') {
        dispatch({ type: 'tictactoe/boardUpdated', payload: response.payload });
      }
    });
    return () => { socket.off('game update') };
  }, []);

  return (
    <DefaultPage>
      <Row className='w-100'>
        <Col sm={4} className='text-center'>
          <h1>Controls</h1>
          <Button variant='outline-danger' onClick={() => createGame('Test Game')}>Create</Button>
          <Button variant='outline-secondary' onClick={() => joinGame('Test Game')}>Join</Button>
          <Button variant='outline-primary' onClick={() => tictactoeStart()}>Start</Button>
        </Col>
        <Col sm={4}>
          {/* <div className='p-0 m-0'>
            <h2>Latest Response</h2>
            <p>{'Type: ' + gameResponse?.type}</p>
            <p>{'Error: ' + gameResponse?.error}</p>
            <p>{'Payload: ' + gameResponse?.payload}</p>
            <p>{'Message: ' + gameResponse?.message}</p>
          </div> */}
        </Col>
        <Col sm={4} className='d-flex flex-column align-items-center'>
          <h1>Board</h1>
          <Board x={3} y={3} />
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default ManagerPage;