import React from 'react';
import { Col, Row, Container } from 'react-bootstrap';
import DummyBoard from '../tictactoe/DummyBoard';
const AnimationPage = () => {
  return (
    <Container fluid>
      <Row className='w-100'>
        <Col className=''>
          <DummyBoard dimensions={{x: 3, y: 3}} />
        </Col>
      </Row>
    </Container>
  );
}

export default AnimationPage;

