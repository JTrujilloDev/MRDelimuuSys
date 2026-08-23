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

const activeDisplayAccounts = new Map<number, number>();
const terminalRoom = (terminalId: number) => `client-display:${terminalId}`;

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });

  socket.on("client-display:join", async ({ terminalId }) => {
    const parsedTerminalId = Number(terminalId);
    if (!Number.isInteger(parsedTerminalId)) return;
    socket.join(terminalRoom(parsedTerminalId));

    const accountId = activeDisplayAccounts.get(parsedTerminalId);
    const account = accountId ? await getAccountByIdService(accountId) : null;
    socket.emit("account-updated", account);
  });

  socket.on("show-account", async ({ accountId, terminalId }) => {
    try {
      const account = await getAccountByIdService(Number(accountId));
      if (!account) return;
      const targetTerminalId = Number(terminalId ?? account.terminalId);
      activeDisplayAccounts.set(targetTerminalId, account.id);
      io.to(terminalRoom(targetTerminalId)).emit("account-updated", account);
    } catch (error) {
      console.error("Unable to update client display", error);
    }
  });

  socket.on("clear-view", ({ terminalId } = {}) => {
    const parsedTerminalId = Number(terminalId);
    if (!Number.isInteger(parsedTerminalId)) return;
    activeDisplayAccounts.delete(parsedTerminalId);
    io.to(terminalRoom(parsedTerminalId)).emit("account-updated", null);
  });

  socket.on("generate-qr", ({ terminalId, total }) => {
    const parsedTerminalId = Number(terminalId);
    if (!Number.isInteger(parsedTerminalId)) return;
    io.to(terminalRoom(parsedTerminalId)).emit("show-qr", { total: Number(total) || 0 });
  });
});

httpServer.listen(3000, () => {
  console.log("Server running");
});
