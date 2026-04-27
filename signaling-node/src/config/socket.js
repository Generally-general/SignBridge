import { Server } from "socket.io";
import { verifySocketToken } from "../middleware/authMiddleware.js";
import { registerSocketEvents } from "../rooms/roomHandler.js";

export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.use(verifySocketToken);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.userId);
    registerSocketEvents(io, socket);
  });
};