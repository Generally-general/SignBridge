import "dotenv/config";
import express from "express";
import http from "http";
import https from "https";
import fs from "fs";
import cors from "cors";
import { initializeSocket } from "./config/socket.js";
import { corsOrigin } from "./config/corsOrigin.js";


const app = express();
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const { SSL_CERT_PATH, SSL_KEY_PATH } = process.env;

let server;
let usingHttps = false;

if (SSL_CERT_PATH && SSL_KEY_PATH) {
  const httpsOptions = {
    cert: fs.readFileSync(SSL_CERT_PATH),
    key: fs.readFileSync(SSL_KEY_PATH),
  };
  server = https.createServer(httpsOptions, app);
  usingHttps = true;
} else {
  server = http.createServer(app);
  console.warn(
    "⚠️  SSL_CERT_PATH/SSL_KEY_PATH not set — signaling server starting over " +
    "plain HTTP. If the frontend is served over HTTPS, the browser WILL block " +
    "this as mixed content. See signaling-node/.env.",
  );
}

initializeSocket(server);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `Signaling Server running on port ${PORT} (${usingHttps ? "https/wss" : "http/ws"})`,
  );
});

process.on("unhandledRejection", (err) => console.error("Unhandled rejection (server kept running):", err));
process.on("uncaughtException", (err) => console.error("Uncaught exception (server kept running):", err));