import React from 'react';
import { Container } from 'react-bootstrap';

interface DefaultPageProps {
  children: React.ReactNode;
}

const DefaultPage = (props: DefaultPageProps) => {
  return (
    <Container fluid className='d-flex align-items-center justify-content-center flex-column'>
      {props.children}
    </Container>
  );
}
export default DefaultPage;
