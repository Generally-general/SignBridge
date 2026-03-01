import { Server } from "socket.io";
import { verifySocketToken } from "../middleware/authMiddleware.js";
import { registerSocketEvents } from "../rooms/roomHandler.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.use(verifySocketToken);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    registerSocketEvents(io, socket);
  });
};