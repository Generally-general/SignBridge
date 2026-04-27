import jwt from "jsonwebtoken"

export const verifySocketToken = (socket, next) => {

    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
        return next(new Error("Authentication error"));
    }

    try {
        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
        socket.userId = decoded.userId;

        next();
    } catch (error) {
        next(new Error('Authentication error: Invalid token'));
    }
};