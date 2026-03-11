import { io } from "socket.io-client";
const tempToken = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsInN1YiI6InRlc3RAZ21haWwuY29tIiwiaWF0IjoxNzcyNDU4MzQwLCJleHAiOjE3NzI1NDQ3NDB9.JHarUJLXkIRWqI0lxUlfTgr5i_wZnl6z4650_EUpSs0"

export const socket = io("http://localhost:5000", {
  auth: {
    token: tempToken,
  },
});