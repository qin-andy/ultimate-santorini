import React from 'react';
import { Col, Row, Container } from 'react-bootstrap';

function App() {
  return (
    <Container fluid className='d-flex align-items-center justify-content-center flex-column'>
      <Row>
        <Col className='text-center'>
          <h1>Hello World!</h1>
        </Col>
      </Row>
      <Row>
        <Col className='text-center'>
          <h1>Hello World!</h1>
        </Col>
        <Col className='text-center'>
          <h1>Hello World!</h1>
        </Col>
      </Row>
    </Container>
  );
}
export default App;
