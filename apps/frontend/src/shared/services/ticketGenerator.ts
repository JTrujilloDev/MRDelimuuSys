
const LINE_WIDTH = 32;

const COLS = {
  name: 20,
  qty: 4,
  price: 8,
};

const padRight = (text: string, length: number) =>
  text.padEnd(length, " ").slice(0, length);

const padLeft = (text: string, length: number) =>
  text.padStart(length, " ").slice(-length);

const wrapText = (text: string, max: number) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    if ((current + word).length <= max) {
      current += word + " ";
    } else {
      lines.push(current.trim());
      current = word + " ";
    }
  });

  if (current) lines.push(current.trim());

  return lines;
};

const formatItem = (name: string, qty: number, price: number) => {
  const lines: string[] = [];

  const nameLines = wrapText(name, COLS.name);

  nameLines.forEach((line, index) => {
    if (index === 0) {
      lines.push(
        padRight(line, COLS.name) +
          padLeft(qty.toString(), COLS.qty) +
          padLeft(price.toLocaleString(), COLS.price),
      );
    } else {
      lines.push(line);
    }
  });

  return lines;
};

export const getBase64Logo = async () => {
  const imgUrl = new URL("../assets/logo.png", import.meta.url).href;

  const response = await fetch(imgUrl);
  const blob = await response.blob();

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export const buildTicket = (order: any) => {
  const lines: any[] = [];

  // INIT
  lines.push("\x1B\x40");

  // 🖼️ LOGO
  lines.push("\x1B\x61\x01"); // center
  lines.push({
    type: "raw",
    format: "image",
    flavor: "file",
    data: `${window.location.origin}/Logo384.png`,
    options: { language: "ESCPOS", dotDensity: "double" },
  });
  lines.push("\x1B\x61\x01"); // center
  lines.push("Km 64 - Via La Mesa - Anapoima\n");

  // 👤 INFO NEGOCIO / RESPONSABLE
  lines.push("\x1B\x61\x01"); // center
  lines.push("\x1B\x45\x01"); // bold
  lines.push("Julian Trujillo Roa\n");
  lines.push("\x1B\x45\x00");
  lines.push("NIT: 79062341-1\n\n");

  // 📍 DIRECCIÓN
  lines.push("\x1B\x61\x00"); // left

  // 👤 CLIENTE
  lines.push("\x1B\x45\x01");
  lines.push("Cliente:\n");
  lines.push("\x1B\x45\x00");

  lines.push(`${order.client}\n`);
  lines.push(`NIT: ${order.nit}\n`);
  lines.push(`Fecha: ${order.date}\n\n`);

  // 🧮 TABLA HEADER
  lines.push(
    padRight("Producto", COLS.name) +
      padLeft("Cant", COLS.qty) +
      padLeft("Total", COLS.price) +
      "\n"
  );

  // ITEMS
  order.items.forEach((item: any) => {
    lines.push(...formatItem(item.name, item.qty, item.price));
  });

  lines.push("\n"); // más aire después del logo
  lines.push("\n");

  // 💰 TOTAL DESTACADO
  lines.push("\x1B\x45\x01"); // bold
  lines.push("\x1B\x21\x10"); // tamaño medio

  lines.push(
    padRight("TOTAL", COLS.name + COLS.qty) +
      padLeft(order.total.toLocaleString(), COLS.price) +
      "\n"
  );

  lines.push("\x1B\x21\x00"); // normal
  lines.push("\x1B\x45\x00"); // bold off

  lines.push("\n");
  lines.push("\x1B\x61\x01"); // center


 lines.push({
    type: "raw",
    format: "image",
    flavor: "file",
    data: `${window.location.origin}/footer384.png`,
    options: { language: "ESCPOS", dotDensity: "double" },
  });
  lines.push("\n\n");

  return lines;
};
