import React from 'react';
import { Col, Row, Button } from 'react-bootstrap';
import LinkButton from '../components/LinkButton';
import DefaultPage from './DefaultPage';

const CreatePage = () => {
  return (
    <DefaultPage>
      <Row>
        <Col className='text-center'>
          <h1>Create!</h1>
          <LinkButton to='/' variant='outline-danger'>
            Home
          </LinkButton>
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default CreatePage;
