import React, { useState } from 'react';
import { Col, Row, Container } from 'react-bootstrap';
import DummyBoard from '../tictactoe/DummyBoard';
const AnimationPage = () => {
  const [active, setActive] = useState(false);
  return (
    <Container>
      <Row className='w-100'>
        <Col className=''>
          <DummyBoard dimensions={{x: 10, y: 10}} />
        </Col>
      </Row>
    </Container>

  );
}

export default AnimationPage;

