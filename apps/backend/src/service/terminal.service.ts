import { Terminal } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

export const createTerminalService = async (terminalData: Terminal) => {
  const terminal = await prisma.terminal.create({
    data: {
      name: terminalData.name,
      storeId: terminalData.storeId,
    },
  });
  return terminal;
};
