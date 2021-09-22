import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import AnimationPage from './manager/AnimationPage';
import GamePage from './manager/GamePage';
import './App.scss';
import SantoriniPage from './santorini/SantoriniPage';


const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/animation">
          <AnimationPage />
        </Route>
        <Route path="/">
          <SantoriniPage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}
export default App;
