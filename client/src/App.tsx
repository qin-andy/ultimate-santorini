import React from 'react';
import { Col, Row, Container } from 'react-bootstrap';
import './App.css';
import './bootstrap.min.css';

function App() {
  return (
    <Container className='d-flex align-items-center'>
      <Row className='w-100 align-items-center'>
        <Col className='text-center'>
          <h1>Hello World!</h1>
        </Col>
      </Row>
    </Container>
  );
}
export default App;
