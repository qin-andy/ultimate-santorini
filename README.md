# [quicktactoe-live](https://quicktactoe.herokuapp.com/)
A multiplayer matchmaking-based tictactoe web experience with minimal setup. 

Frontend web client written in **[React](https://reactjs.org/)**, **[Redux](https://redux.js.org/)**, and **[Framer Motion](https://www.framer.com/motion/)**

Backend game server written in **Node**, **[Express](https://expressjs.com/)**, and **[SocketIO](https://socket.io/)**, with comprehensive testing suite written in Jest

## Features
  - Seamless matchmaking experience with automated queuing, game creation, and requeing on game end
  - Fluid, minimalist UI and animations powered by React and Framer Motion
  - Customizable setup options with simple configuration options for board size, win conditions, automated queuing
  - Extendable player management and game management backend architecture featuring custom game support
  - Complete backend testing suite

## Usage
### Setting up Local Development
Both the frontend and backend are written in [Typescript](https://www.typescriptlang.org/)
  1. Run ``git clone`` to the directory of your choice
  2. Install workspace dependencies from root with ``yarn install``
  3. Run ``yarn workspace client start`` for the React live development server on ``http://localhost:3000``, proxied to port 3001
  4. Run ``yarn workspace server start`` for hot-reloading backend development on ``http://localhost:3001``
  5. Run Jest test suite with ``yarn workspace server jest``

### Build and Deployment
  1. Run ``yarn workspace client build`` to bundle frontend into ``client/build`` folder
  2. Run ``cd server`` and ``tsc`` to compile Typescript server into ``server/build`` folder
  3. run ``node server/build/server.js`` to serve 
