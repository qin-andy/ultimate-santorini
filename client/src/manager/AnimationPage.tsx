import React from 'react';
import { Col, Row, Container } from 'react-bootstrap';
import DummyBoard from '../tictactoe/DummyBoard';
const AnimationPage = () => {
  return (
    <Container>
      <Row className='w-100'>
        <Col className=''>
          <DummyBoard dimensions={{x: 6, y: 6}} />
        </Col>
      </Row>
    </Container>
  );
}

export default AnimationPage;

