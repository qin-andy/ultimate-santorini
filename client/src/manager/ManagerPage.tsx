import React, { useEffect } from 'react';
import { Button, Card, Col, ListGroup, Row } from 'react-bootstrap';

import DefaultPage from '../components/DefaultPage';
import socket, { createGame, getPlayerInfo, joinGame, leaveGame, tictactoeStart } from '../services/socket';
import Board from '../tictactoe/Board';
import { useAppDispatch, useAppSelector } from '../hooks/hooks';
import { GameResponse, ManagerResponse, marking } from '../types';

const ManagerPage = () => {
  const dispatch = useAppDispatch();
  const winner = useAppSelector(state => state.tictactoe.winner);
  const running = useAppSelector(state => state.tictactoe.running);
  const won = useAppSelector(state => state.tictactoe.completed);
  const gameLatestResponse = useAppSelector(state => state.tictactoe.latestResponse);
  const managerLatestResponse = useAppSelector(state => state.manager.latestResponse);
  const playerInfo = useAppSelector(state => {
    let info = {
      name: state.manager.player,
      id: state.manager.id,
      inGame: state.manager.inGame,
      gameName: state.manager.gameName,
    }
    return info;
  });
  let gameBg = gameLatestResponse?.error ? 'danger' : 'success';
  let managerBg = managerLatestResponse?.error ? 'danger' : 'success';

  useEffect(() => {
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
            winner: response.payload.winner, board: response.payload.board
          }
        });
      }
    });

    socket.on('manager response', (response: ManagerResponse) => {
      console.log('recieved manager response:')
      console.log(response);
      dispatch({ type: 'manager/managerResponseReceived', payload: response });
      if (response.type === 'player info') dispatch({ type: 'manager/playerInfoReceived', payload: response.payload });
    });

    return () => {
      socket.off('game update')
      socket.off('manager response')
    };
  }, []);

  return (
    <DefaultPage>
      <Row className='w-100'>
        <Col sm={4} className='text-center d-flex flex-column'>
          <h1>Controls</h1>
          <Button variant='outline-danger' onClick={() => createGame('Test Game')}>Create</Button>
          <Button variant='outline-secondary' onClick={() => joinGame('Test Game')}>Join</Button>
          <Button variant='outline-primary' onClick={() => leaveGame('Test Game')}>Leave</Button>
          <Button variant='outline-primary' onClick={() => tictactoeStart()}>Start</Button>
          <Card>
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
          <Button variant='outline-primary' onClick={() => getPlayerInfo('')}>Refresh Info</Button>
        </Col>
        <Col sm={4} className='d-flex flex-column align-items-center'>
          <h1>Board</h1>
          <Board x={3} y={3} />
          {won ? <h2>Winner: {winner}</h2> : null}
        </Col>
        <Col sm={4}>
          <Card bg={gameBg}>
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
          <Card bg={managerBg}>
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
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default ManagerPage;
