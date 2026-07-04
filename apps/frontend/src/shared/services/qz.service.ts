import qz from "qz-tray";
import { buildTicket } from "./ticketGenerator";
import type { OrderInfo } from "../../modules/POS/components/CheckoutView";
import { initializeQZ } from "./initializeQZ.service";

let isConnecting = false;

export const connectQZ = async () => {
  // Configura certificados y firma una sola vez
  initializeQZ();

  // Ya está conectado
  if (qz.websocket.isActive()) {
    return await qz.printers.find();
  }

  // Evita conexiones simultáneas
  if (isConnecting) {
    return;
  }

  try {
    isConnecting = true;

    await qz.websocket.connect();

    console.log("✅ QZ conectado");

    const printerList = await qz.printers.find();

    console.log("🖨️ Impresoras encontradas:", printerList);

    return printerList;
  } catch (err) {
    console.error("❌ Error conectando QZ", err);
    throw err;
  } finally {
    isConnecting = false;
  }
};

export const printTicketService = async (
  printerName: string,
  order: OrderInfo | PrinterCommand,
) => {
  try {
    await connectQZ();

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

export const printLabelService = async (printerName: string, tspl: string) => {
  try {
    await connectQZ();

    const config = qz.configs.create(printerName, {
      forceRaw: true,
      encoding: "CP437",
    });

    await qz.print(config, [
      {
        type: "raw",
        format: "command",
        data: tspl,
      },
    ]);

    console.log("✅ Impresión enviada");
  } catch (error) {
    console.error("❌ Error imprimiendo:", error);
  }
};
