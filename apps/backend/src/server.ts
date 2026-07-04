import { createServer } from "http";
import { Server } from "socket.io";

import app from "./app";
import { setIO } from "./socket";
import { getAccountByIdService } from './service/accounts.service';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

setIO(io);

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });

  socket.on("show-account", async ({ accountId }) => {
    const account = await getAccountByIdService(accountId);

    io.emit("account-updated", account);
  });

  socket.on("clear-view", () => {
    io.emit("account-updated", null);
  });

  socket.on("generate-qr", () => {
    console.log("Mostrando QR");
    io.emit("show-qr");
  });
});

httpServer.listen(3000, () => {
  console.log("Server running");
});
