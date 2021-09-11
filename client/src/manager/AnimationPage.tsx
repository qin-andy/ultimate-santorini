import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Col, Form, ListGroup, Row } from 'react-bootstrap';
import { CSSTransition } from 'react-transition-group';

import DefaultPage from '../components/DefaultPage';
import { useAppDispatch } from '../hooks/hooks';
import DummyBoard from '../tictactoe/DummyBoard';
import { marking } from '../types';

const AnimationPage = () => {
  const [active, setActive] = useState(false);
  const nodeRef = useRef(null);
  return (
    <DefaultPage>
      <Row className='w-100'>
        <Col className='d-flex flex-column align-items-center'>
          <DummyBoard x={3} y={3} />
        </Col>
      </Row>
    </DefaultPage>
  );
}

export default AnimationPage;

