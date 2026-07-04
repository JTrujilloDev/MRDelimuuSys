import { Server } from "socket.io";

let io: Server;

export const setIO = (socketIO: Server) => {
  io = socketIO;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }

  return io;
};