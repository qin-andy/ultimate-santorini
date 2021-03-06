# [ultimate-santorini](https://santorini-live.herokuapp.com/)

A multiplayer matchmaking-based platform on the popular block-building board game. **Enter matchmaking queue just by loading the page!**

Supports online crossplay between 2d web client and Unity3d native application client.

Frontend web client written in **[React](https://reactjs.org/)**, and **[Framer Motion](https://www.framer.com/motion/)**. Backend game server written in **Node**, **[Express](https://expressjs.com/)**, and **[SocketIO](https://socket.io/)**. Native PC and MacOS clients written in **C#** using **[Unity3D](https://unity.com/)**. Computer player AI written in C#.

<img src="https://github.com/qin-andy/ultimate-santorini/blob/main/images/santorini.png" alt="blocks and buildings on the web and unity clients"></img>

## Related Repos
### [Download Unity client](https://github.com/qin-andy/santorini-unity-client)
### [Visit the web deployment](https://santorini-live.herokuapp.com/)
### [Computer AI Opponent Microservice](https://github.com/qin-andy/SantoriniBot.git)

## Usage
### Setting up Local Development
Both the frontend and backend are written in [Typescript](https://www.typescriptlang.org/)
  1. Run ``git clone`` to the directory of your choice
  2. Install workspace dependencies from root with ``yarn install``
  3. Run ``yarn workspace client start`` for the React live development server on ``http://localhost:3000``, proxied to port 3001
  4. Run ``yarn workspace server start`` for hot-reloading backend development on ``http://localhost:3001``

### Build and Deployment
  1. Run ``yarn workspace client build`` to bundle frontend into ``client/build`` folder
  2. Run ``cd server`` and ``tsc`` to compile Typescript server into ``server/build`` folder
  3. run ``node server/build/server.js`` to serve 
