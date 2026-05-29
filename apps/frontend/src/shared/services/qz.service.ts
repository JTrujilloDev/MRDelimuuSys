import qz from "qz-tray";
import { buildTicket } from "./ticketGenerator";
import type { OrderInfo } from "../../modules/POS/components/CheckoutView";

let isConnecting = false;

export const connectQZ = async () => {
  if (qz.websocket.isActive()) return;

  if (isConnecting) return;

  try {
    isConnecting = true;
    await qz.websocket.connect();
    console.log("QZ conectado");
    
    const printerList = await qz.printers.find();
    // console.log("Impresoras encontradas:", printerList);
    
    // 2. Return the array of printer names
    return printerList;
  } catch (err) {
    console.error("Error conectando QZ", err);
    throw err;
  } finally {
    isConnecting = false;
  }
};

export const printTicketService = async (printerName: string, order: OrderInfo | PrinterCommand) => {
  try {
    // await connectQZ

    const config = qz.configs.create(printerName, {
      forceRaw: true,
      encoding: "CP437",
      colorType: "blackwhite",
    });

    const data = buildTicket(order);

    await qz.print(config, data);

    console.log("✅ Impresión enviada");
  } catch (error) {
    console.error("❌ Error imprimiendo:", error);
  }
};
