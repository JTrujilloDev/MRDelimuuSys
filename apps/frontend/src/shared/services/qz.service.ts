import qz from "qz-tray";
import { buildTicket } from "./ticketGenerator";

let isConnecting = false;

export const connectQZ = async () => {
  if (qz.websocket.isActive()) return;

  if (isConnecting) return;

  try {
    isConnecting = true;
    await qz.websocket.connect();
    console.log("QZ conectado");
  } catch (err) {
    console.error("Error conectando QZ", err);
    throw err;
  } finally {
    isConnecting = false;
  }
};

export const getPrinters = async () => {
  await connectQZ();
  return await qz.printers.find("XP-58").then((printers) => {
    console.log("Impresoras encontradas:", printers);

    return printers;
  });
};

export const printTest = async (printerName: string) => {
  try {
    // await connectQZ

    const config = qz.configs.create(printerName, {
      forceRaw: true,
      encoding: "CP437",
      colorType: "blackwhite",
    });

    const order = {
      client: "Julian Trujillo",
      nit: "79062341",
      date: "20/04/26",
      total: 15000,
      items: [
        { name: "Hamburguesa doble", qty: 2, price: 10000 },
        { name: "Papas fritas", qty: 1, price: 5000 },
      ],
    };

    const data = buildTicket(order);




    await qz.print(config, data);

    console.log("✅ Impresión enviada");
  } catch (error) {
    console.error("❌ Error imprimiendo:", error);
  }
};
