import http from "http";
import express from "express";
import path from "path";
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
//import WebSocket, { WebSocketServer } from "ws";

const __dirname = path.resolve();
const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/src/views");

app.use("/public", express.static(__dirname + "/src/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log("Listening at http://localhost:3000");

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
  cors: {
    origin: ["https://admin.socket.io"],
    credentials: true,
  },
});

instrument(wsServer, {
  auth: false,
});

function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  // equals sid = const wsServer.socket.adapter.sids
  //        rooms = const wsServer.socket.adapter.rooms
  const publicRooms = [];

  rooms.forEach((_, key) => {
    //'adapter' is made of (value, key)
    if (sids.get(key) === undefined) {
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

function countRoom(roomName) {
  return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
  socket["nickname"] = "Anon";

  socket.on("enter_room", (roomName, nickName, done) => {
    socket.join(roomName);
    socket["nickname"] = nickName;
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    wsServer.sockets.emit("roomchange", publicRooms());
    done();
  });

  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) => {
      socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1);
    });
  });

  socket.on("disconnect", () => {
    wsServer.sockets.emit("roomchange", publicRooms());
  });

  socket.on("new_message", (msg, roomName, done) => {
    socket.to(roomName).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });
});

/*const sockets = [];

wss.on("connection", (socket) => {
  socket["nickname"] = "Anon";

  sockets.push(socket);

  console.log("Connected to Browser !!!");

  socket.on("close", () => {
    console.log("Disconnected to Client");
  });

  socket.on("message", (msg) => {
    const message = JSON.parse(msg);

    switch (message.type) {
      case "new_message":
        sockets.forEach((aSocket) =>
          aSocket.send(`${socket.nickname}: ${message.payload}`)
        );
        break;
      case "nickname":
        socket["nickname"] = message.payload;
        break;
    }
  });
});*/

httpServer.listen(3000, handleListen);
