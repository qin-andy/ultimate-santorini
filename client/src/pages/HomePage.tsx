import React from 'react';
import { Col, Row, Container, Button } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import LinkButton from '../components/LinkButton';
import DefaultPage from './DefaultPage';

const HomePage = () => {
  return (
    <DefaultPage>
      <Row>
        <Col className='text-center'>
          <h1>Hello World!</h1>
          <LinkButton to='/join' variant='outline-primary'>
            Join
          </LinkButton>
          <LinkButton to='/create' variant='outline-primary'>
            Create
          </LinkButton>
        </Col>
      </Row>
    </DefaultPage>
  );
}
export default HomePage;
