import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import { initializeSocket } from "./config/socket.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "https://localhost:5173" }));
app.use(express.json());

const server = http.createServer(app);

initializeSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Signaling Server running on port ${PORT}`);
});