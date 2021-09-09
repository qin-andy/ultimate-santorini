import React from 'react';
import { Col, Row } from 'react-bootstrap';
import DefaultPage from './DefaultPage';
import QueueButton from '../components/QueueButton';


const HomePage = () => {
  return (
    <DefaultPage>
      <Row>
        <Col className='text-center'>
          <h1>Board</h1>
          {false ?
            <p /> :
            <QueueButton/>
          }
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default HomePage;
