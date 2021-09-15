import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import AnimationPage from './manager/AnimationPage';
import GamePage from './manager/GamePage';
import './App.scss';


const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/animation">
          <AnimationPage />
        </Route>
        <Route path="/">
          <GamePage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}
export default App;
