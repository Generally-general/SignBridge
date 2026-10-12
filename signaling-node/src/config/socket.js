import { Server } from "socket.io";
import { verifySocketToken } from "../middleware/authMiddleware.js";
import { registerSocketEvents } from "../rooms/roomHandler.js";
import { corsOrigin } from "./corsOrigin.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"]
    },
    pingInterval: 8000,
    pingTimeout: 6000
  });

  io.use(verifySocketToken);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.userId);
    registerSocketEvents(io, socket);
  });
};