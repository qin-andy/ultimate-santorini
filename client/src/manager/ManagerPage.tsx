import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Form, ListGroup, Row, Container } from 'react-bootstrap';

import socket, { createGame, getPlayerInfo, joinGame, leaveGame, tictactoeStart } from '../services/socket';
import Board from '../tictactoe/Board';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { GameResponse, ManagerResponse, marking } from '../types';
import { motion, AnimateSharedLayout } from 'framer-motion';

const ManagerPage = () => {
  const dispatch = useAppDispatch();
  const winner = useAppSelector(state => state.tictactoe.winner);
  const won = useAppSelector(state => state.tictactoe.completed);
  const running = useAppSelector(state => state.tictactoe.running);
  const gameName = useAppSelector(state => state.manager.gameName);

  const [inputGame, setInputGame] = useState('Test Game');


  useEffect(() => {
    // Routing listeners to store updates
    socket.on('game update', (response: GameResponse) => {
      console.log('recieved game response:')
      console.log(response);
      dispatch({ type: 'tictactoe/gameResponseReceived', payload: response })
      if (response.type === 'start success') {
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
            winningMark: response.payload.mark
          }
        });
      }
    });

    socket.on('manager response', (response: ManagerResponse) => {
      console.log('recieved manager response:')
      console.log(response);
      if (response.type === 'player info') dispatch({
        type: 'manager/playerInfoReceived',
        payload: response.payload
      });
      else dispatch({ type: 'manager/managerResponseReceived', payload: response });
    });

    let refreshInfo = setInterval(() => {
      getPlayerInfo('');
    }, 500);

    return () => {
      socket.off('game update')
      socket.off('manager response')
      clearInterval(refreshInfo);
    };
  }, []);

  return (
    <Container fluid className='w-100 d-flex flex-column justify-content-center'>
      <Row className='w-100 d-flex flex-row align-items-center'>
        <Col sm={4} className='p-2 d-flex flex-column text-center'>
          <h1>Controls</h1>
          <Form onSubmit={e => e.preventDefault()}>
            <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>Game Name</Form.Label>
              <Form.Control
                className='text-center'
                value={inputGame}
                onChange={
                  (e) => {
                    setInputGame(e.currentTarget.value);
                  }
                }
              />
            </Form.Group>
          </Form>
          <Button variant='outline-danger' onClick={() => createGame(inputGame)}>Create</Button>
          <Button variant='outline-secondary' onClick={() => joinGame(inputGame)}>Join</Button>
          <Button variant='outline-primary' onClick={() => leaveGame(inputGame)}>Leave</Button>
          <Button variant='outline-primary' onClick={() => tictactoeStart()}>Start</Button>
          <PlayerInfoCard />
        </Col>
        <Col sm={4} className='p-2 d-flex flex-column align-items-center text-center'>
          <AnimateSharedLayout>
            <motion.h1 layout>{gameName ? gameName : 'Waiting to Join Game'}</motion.h1>
            <Board dimensions={{ x: 3, y: 3 }} />
            <motion.h2 layout>Winner: {winner}</motion.h2>
          </AnimateSharedLayout>
        </Col>
        <Col sm={4} className='p-2 d-flex flex-column align-items-center'>
          <LatestGameResponseCard />
          <LatestManagerResponseCard />
        </Col>
      </Row>
    </Container >
  );
}

const PlayerInfoCard = () => {
  const playerInfo = useAppSelector(state => {
    let info = {
      name: state.manager.player,
      id: state.manager.id,
      inGame: state.manager.inGame,
      gameName: state.manager.gameName,
    }
    return info;
  });

  return (
    <Card onClick={() => getPlayerInfo('')}>
      <Card.Body>
        <Card.Header as='h3'>Player Info</Card.Header>
        <ListGroup variant='flush'>
          <ListGroup.Item>{'Name: ' + playerInfo?.name}</ListGroup.Item>
          <ListGroup.Item>{'Id: ' + playerInfo?.id}</ListGroup.Item>
          <ListGroup.Item>{'In Game: ' + playerInfo?.inGame}</ListGroup.Item>
          <ListGroup.Item>{'Game Name: ' + playerInfo?.gameName}</ListGroup.Item>
        </ListGroup>
      </Card.Body>
    </Card>
  );
}

const LatestGameResponseCard = () => {
  const gameLatestResponse = useAppSelector(state => state.tictactoe.latestResponse);
  const gameBg = gameLatestResponse?.error ? 'danger' : 'success';

  return (
    <Card bg={gameBg} className='w-100'>
      <Card.Body>
        <Card.Header as='h3'>Latest Game Response</Card.Header>
        <ListGroup variant='flush'>
          <ListGroup.Item>{'Type: ' + gameLatestResponse?.type}</ListGroup.Item>
          <ListGroup.Item>{'Error: ' + gameLatestResponse?.error}</ListGroup.Item>
          <ListGroup.Item>{'Payload: ' + gameLatestResponse?.payload}</ListGroup.Item>
          <ListGroup.Item>{'Message: ' + gameLatestResponse?.message}</ListGroup.Item>
        </ListGroup>
      </Card.Body>
    </Card>
  );
}

const LatestManagerResponseCard = () => {
  const managerLatestResponse = useAppSelector(state => state.manager.latestResponse);
  let managerBg = managerLatestResponse?.error ? 'danger' : 'success';
  return (
    <Card bg={managerBg} className='w-100'>
      <Card.Body>
        <Card.Header as='h3'>Latest Manager Response</Card.Header>
        <ListGroup variant='flush'>
          <ListGroup.Item>{'Type: ' + managerLatestResponse?.type}</ListGroup.Item>
          <ListGroup.Item>{'Error: ' + managerLatestResponse?.error}</ListGroup.Item>
          <ListGroup.Item>{'Payload: ' + managerLatestResponse?.payload}</ListGroup.Item>
          <ListGroup.Item>{'Message: ' + managerLatestResponse?.message}</ListGroup.Item>
        </ListGroup>
      </Card.Body>
    </Card>
  );
}
export default ManagerPage;
