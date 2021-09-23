import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import './App.scss';
import SantoriniPage from './santorini/SantoriniPage';


const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/">
          <SantoriniPage />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}
export default App;
