const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const PORT = 3000;
const ROOT = __dirname;

const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
};


/* ==========================================
   HTTP SERVER
========================================== */

const server = http.createServer((req, res) => {

    let requestPath = req.url.split("?")[0];

    if (requestPath === "/") {
        requestPath = "/index.html";
    }

    const filePath = path.resolve(
        ROOT,
        "." + requestPath
    );

    /*
     * Prevent path traversal.
     */

    if (
        filePath !== ROOT &&
        !filePath.startsWith(ROOT + path.sep)
    ) {

        res.writeHead(403, {
            "Content-Type": "text/plain"
        });

        res.end("Forbidden");

        return;
    }


    fs.readFile(filePath, (error, data) => {

        if (error) {

            res.writeHead(404, {
                "Content-Type": "text/plain"
            });

            res.end("Not Found");

            return;
        }


        const extension =
            path.extname(filePath).toLowerCase();


        const contentType =
            mimeTypes[extension] ||
            "application/octet-stream";


        res.writeHead(200, {
            "Content-Type": contentType
        });


        res.end(data);
    });
});


/* ==========================================
   WEBSOCKET SERVER
========================================== */

const wss = new WebSocket.Server({
    server
});


/*
rooms:

roomId -> {
    black: socket,
    red: socket
}
*/

const rooms = new Map();


/* ==========================================
   ROOM ID
========================================== */

function createRoomId() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let id;

    do {

        id = "";

        for (let i = 0; i < 6; i++) {

            id += chars[
                Math.floor(
                    Math.random() * chars.length
                )
            ];
        }

    } while (rooms.has(id));

    return id;
}


/* ==========================================
   SEND
========================================== */

function send(socket, data) {

    if (
        socket &&
        socket.readyState === WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify(data)
        );
    }
}


/* ==========================================
   BROADCAST ROOM
========================================== */

function broadcastRoom(room, data) {

    if (!room) {
        return;
    }

    send(
        room.black,
        data
    );

    send(
        room.red,
        data
    );
}


/* ==========================================
   CREATE ROOM
========================================== */

function createRoom(socket) {

    /*
     * Prevent same socket from creating
     * multiple rooms.
     */

    if (socket.roomId) {

        send(socket, {
            type: "error",
            message: "You are already in a room."
        });

        return;
    }


    const roomId =
        createRoomId();


    rooms.set(
        roomId,
        {
            black: socket,
            red: null
        }
    );


    socket.roomId =
        roomId;

    socket.color =
        "black";


    send(socket, {
        type: "created",
        room: roomId,
        color: "black"
    });


    console.log(
        `[ROOM] ${roomId} created`
    );
}


/* ==========================================
   JOIN ROOM
========================================== */

function joinRoom(
    socket,
    roomId
) {

    if (socket.roomId) {

        send(socket, {
            type: "error",
            message: "You are already in a room."
        });

        return;
    }


    const room =
        rooms.get(roomId);


    if (!room) {

        send(socket, {
            type: "error",
            message: "Room not found."
        });

        return;
    }


    if (
        room.red
    ) {

        send(socket, {
            type: "error",
            message: "Room is already full."
        });

        return;
    }


    room.red =
        socket;


    socket.roomId =
        roomId;

    socket.color =
        "red";


    send(socket, {
        type: "joined",
        room: roomId,
        color: "red"
    });


    /*
     * Both players are now connected.
     */

    broadcastRoom(
        room,
        {
            type: "ready"
        }
    );


    console.log(
        `[ROOM] ${roomId} ready`
    );
}


/* ==========================================
   WEBSOCKET CONNECTION
========================================== */

wss.on(
    "connection",
    socket => {

        console.log(
            "[WS] Client connected"
        );


        socket.on(
            "message",
            rawMessage => {

                let message;


                try {

                    message =
                        JSON.parse(
                            rawMessage.toString()
                        );

                } catch {

                    send(socket, {
                        type: "error",
                        message:
                            "Invalid JSON message."
                    });

                    return;
                }


                /* ==========================
                   CREATE ROOM
                ========================== */

                if (
                    message.type === "create"
                ) {

                    createRoom(socket);

                    return;
                }


                /* ==========================
                   JOIN ROOM
                ========================== */

                if (
                    message.type === "join"
                ) {

                    const roomId =
                        String(
                            message.room || ""
                        )
                        .trim()
                        .toUpperCase();


                    if (
                        roomId.length !== 6
                    ) {

                        send(socket, {
                            type: "error",
                            message:
                                "Room ID must contain 6 characters."
                        });

                        return;
                    }


                    joinRoom(
                        socket,
                        roomId
                    );

                    return;
                }


                /* ==========================
                   GAME STATE
                ========================== */

                if (
                    message.type === "state"
                ) {

                    const room =
                        rooms.get(
                            socket.roomId
                        );


                    if (!room) {

                        send(socket, {
                            type: "error",
                            message:
                                "You are not inside a room."
                        });

                        return;
                    }


                    /*
                     * Only send state to the
                     * opponent and sender.
                     */

                    broadcastRoom(
                        room,
                        {
                            type: "state",
                            state: message.state
                        }
                    );


                    return;
                }


                /* ==========================
                   PING
                ========================== */

                if (
                    message.type === "ping"
                ) {

                    send(socket, {
                        type: "pong"
                    });

                    return;
                }
            }
        );


        /* ==============================
           DISCONNECT
        ============================== */

        socket.on(
            "close",
            () => {

                console.log(
                    "[WS] Client disconnected"
                );


                const roomId =
                    socket.roomId;


                if (!roomId) {
                    return;
                }


                const room =
                    rooms.get(roomId);


                if (!room) {
                    return;
                }


                if (
                    room.black === socket
                ) {

                    room.black = null;

                } else if (
                    room.red === socket
                ) {

                    room.red = null;
                }


                /*
                 * Tell remaining player.
                 */

                broadcastRoom(
                    room,
                    {
                        type: "error",
                        message:
                            "Your opponent disconnected."
                    }
                );


                /*
                 * Delete empty room.
                 */

                if (
                    !room.black &&
                    !room.red
                ) {

                    rooms.delete(
                        roomId
                    );


                    console.log(
                        `[ROOM] ${roomId} deleted`
                    );
                }
            }
        );
    }
);


/* ==========================================
   SERVER START
========================================== */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "========================================"
        );

        console.log(
            "        CHECKERS ARENA SERVER"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Local:   http://localhost:${PORT}`
        );

        console.log(
            `Network: http://YOUR-PC-IP:${PORT}`
        );

        console.log(
            "========================================"
        );

        console.log("");
    }
);