import React from 'react';
import { Col, Row } from 'react-bootstrap';
import LinkButton from '../components/LinkButton';
import DefaultPage from './DefaultPage';

const JoinPage = () => {
  return (
    <DefaultPage>
      <Row>
        <Col className='text-center'>
          <h1>Join!</h1>
          <LinkButton to='/' variant='outline-danger'>
            Home
          </LinkButton>
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default JoinPage;
