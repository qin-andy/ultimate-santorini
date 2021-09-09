import { useEffect, useState } from "react"
import { Socket } from "socket.io-client";
import { GameResponse, marking } from "../types";

export const useGameResponse = (socket: Socket) => {
  let [response, setResponse] = useState<GameResponse>()
  useEffect(() => {
    function handleResponse(response: GameResponse) {
      console.log('Response recieved');
      console.log(response);
      setResponse(response);
    }
    socket.on('game update', handleResponse);
    console.log('useGameResponse hook use effect initailized!');
    return () => {
      console.log('cleaning up useGameRespones hook');
      socket.off('game update');
    }
  }, []);
  return response;
}

export const useTictactoeBoard = (socket: Socket) => {
  let gameResponse = useGameResponse(socket);
  let [board, setBoard] = useState<Array<marking>>([])
  useEffect(() => {
    if (gameResponse && gameResponse?.type === 'mark' && !gameResponse?.error) {
      console.log('game response was a board update!');
      setBoard(gameResponse.payload);
    }
  }, [gameResponse])
  console.log(board);
  return board;
}