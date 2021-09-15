import React from 'react';
import DummyBoard from '../tictactoe/DummyBoard';
const AnimationPage = () => {
  return (
    <div className='w-100'>
      <div className=''>
        <DummyBoard dimensions={{ x: 3, y: 3 }} />
      </div>
    </div>
  );
}

export default AnimationPage;

