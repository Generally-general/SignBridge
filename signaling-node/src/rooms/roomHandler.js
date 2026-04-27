
export const registerSocketEvents = (io, socket) => {
  // PERSONAL CHANNEL
  // Automatically join a room based on the Database ID we got from the JWT
  const personalRoom = `user:${socket.userId}`;
  socket.join(personalRoom)
  console.log(`Signaling: User ${socket.userId} joined their personal room: ${personalRoom}`);

  // INITIAING CALL
  // User A calls User B before they are in WebRTC room
  socket.on('call-request', ({ toUserId, fromName, roomId, offer }) => {
    socket.to(`user:${toUserId}`).emit("incoming-call", {
      fromId: socket.userId,
      fromName,
      roomId,
      offer
    })
  })

  // THE WEBRTC ROOM
  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { userId: socket.userId });
    console.log(`Peer ${socket.id} joined call room: ${roomId}`);
  });

  // SIGNALING

  socket.on("offer", (data) => {
    socket.to(data.roomId).emit("offer", data);
  });

  socket.on("answer", (data) => {
    socket.to(`user:${data.toUserId}`).emit("answer", {
      fromId: socket.userId,
      answer: data.answer
    });
  });

  socket.on("ice-candidate", (data) => {
    if (data.toUserId) {
      socket.to(`user:${data.toUserId}`).emit("ice-candidate", data);
    } else {
      socket.to(data.roomId).emit("ice-candidate", data);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  socket.on("metadata-stream", (data) => {
    socket.to(data.roomId).emit("metadata-stream", data);
  });
};