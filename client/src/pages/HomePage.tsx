import React, { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import DefaultPage from './DefaultPage';
import Board from '../tictactoe/Board';
import { marking } from '../types';
import socket from '../services/socket';
import QueueButton from '../components/QueueButton';


const HomePage = () => {
  let [inGame, setInGame] = useState<boolean>(false);

  let [board, setBoard] = useState<Array<marking>>([
    'x', 'x', 'o',
    '*', 'x', 'x',
    '*', 'o', 'o'
  ]);
  let [turn, setTurn] = useState<marking>('o');
  let boardX = 3;
  let boardY = 3;

  const markBoard = (x: number, y: number) => {
    let newBoard = { ...board };
    newBoard[x + y * boardX] = turn;
    setTurn(turn === 'o' ? 'x' : 'o');
    setBoard(newBoard);
  }

  console.log(socket.connected);

  return (
    <DefaultPage>
      <Row>
        <Col className='text-center'>
          {/* <h1>Board</h1> */}
          {inGame ?
            <Board data={board} x={boardX} y={boardY} onClick={markBoard} /> :
            <QueueButton
              setInGame={setInGame}
              clicked={() => console.log('Queue Button Clicked!')}
            />
          }
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default HomePage;
