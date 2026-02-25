import jwt from "jsonwebtoken"

export const verifySocketToken = (socket, next) => {
    try{
        const token = socket.handshake.auth.token;

        if(!token) {
            return next(new Error("Authentication error"));
        }

        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        socket.user = decoded;

        next();
    } catch(err) {
        next(new Error("Invalid Token"));
    }
};