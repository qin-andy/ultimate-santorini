import React, { useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import LinkButton from '../components/LinkButton';
import DefaultPage from './DefaultPage';
import Board from '../tictactoe/Board';
import { marking } from '../types';
import socket from '../services/socket';


const HomePage = () => {
  let [board, setBoard] = useState<Array<marking>>([
    'x', 'x', 'o',
    '*', 'x', 'x',
    '*', 'o', 'o'
  ]);
  let [turn, setTurn] = useState<marking>('o');
  let boardX = 3;
  let boardY = 3;

  const markBoard = (x: number, y: number) => {
    let newBoard = {...board};
    newBoard[x + y*boardX] = turn;
    setTurn(turn === 'o' ? 'x' : 'o');
    setBoard(newBoard);
  }

  console.log(socket.connected);

  return (
    <DefaultPage>
      <Row>
        <Col className='text-center'>
          <h1>Board</h1>
          <Board data={board} x={boardX} y={boardY} onClick={markBoard} />
          <LinkButton to='/join' variant='outline-primary'>
            Join
          </LinkButton>
          <LinkButton to='/create' variant='outline-primary'>
            Create
          </LinkButton>
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default HomePage;
