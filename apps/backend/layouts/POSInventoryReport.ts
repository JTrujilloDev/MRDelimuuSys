import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { CategoryGroup } from "../src/service/reportGenerator.service";

const getLogoDataUri = () => {
  const candidates = [
    path.resolve(__dirname, "../..", "frontend", "public", "Logo384.png"),
    path.resolve(process.cwd(), "..", "frontend", "public", "Logo384.png"),
    path.resolve(process.cwd(), "src", "assets", "Logo384.png"),
  ];

  const logoPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!logoPath) {
    return "";
  }

  const logoBase64 = fs.readFileSync(logoPath, "base64");
  return `data:image/png;base64,${logoBase64}`;
};

export const POSInventoryReport = (categories: CategoryGroup[]) => {
  const logoDataUri = getLogoDataUri();
  const reportLayout = `
    <!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Verificación de Inventario</title>

<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #000;
    padding: 30px;
    font-size: 12px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-bottom: 20px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo {
    width: 90px;
    height: auto;
    object-fit: contain;
  }

  .company-name {
    font-size: 22px;
    font-weight: bold;
    margin-bottom: 5px;
  }

  .document-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 0;
    margin-left: 100px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 25px;
  }

  .field {
    display: flex;
    gap: 10px;
  }

  .field-label {
    font-weight: bold;
    min-width: 80px;
  }

  .line {
    flex: 1;
    border-bottom: 1px solid #000;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 25px;
  }

  th,
  td {
    border: 1px solid #000;
    padding: 8px;
  }

  th {
    background: #f3f3f3;
    text-align: center;
  }

  td {
    height: 30px;
  }

  .product-column {
    width: 45%;
  }

  .sku-column {
    width: 15%;
  }

  .system-column {
    width: 15%;
    text-align: center;
  }

  .physical-column {
    width: 15%;
  }

  .difference-column {
    width: 10%;
  }

  .center {
    text-align: center;
  }

  .category-section {
    margin-bottom: 20px;
    page-break-inside: avoid;
  }

  .category-header {
    background: #333;
    color: white;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 8px;
    border-radius: 3px;
  }

  .category-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 15px;
  }

  .category-table th,
  .category-table td {
    border: 1px solid #999;
    padding: 8px;
  }

  .category-table th {
    background: #e8e8e8;
    text-align: center;
    font-size: 11px;
  }

  .category-table td {
    height: 28px;
    font-size: 11px;
  }

  .observations {
    margin-top: 20px;
  }

  .observations h3 {
    margin-bottom: 10px;
  }

  .obs-line {
    border-bottom: 1px solid #000;
    height: 25px;
    margin-bottom: 8px;
  }

  .signature-section {
    margin-top: 60px;
    display: flex;
    justify-content: space-between;
  }

  .signature-box {
    width: 250px;
    text-align: center;
  }

  .signature-line {
    border-top: 1px solid #000;
    margin-bottom: 5px;
  }

  @media print {
    body {
      padding: 15px;
    }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    ${logoDataUri ? `<img class="logo" src="${logoDataUri}" alt="Logo" />` : ""}
    <div>
      <div class="document-title">FORMATO DE VERIFICACIÓN DE INVENTARIO</div>
    </div>
  </div>
</div>

<div class="info-grid">
  <div class="field">
    <span class="field-label">Fecha: ${dayjs().format("DD/MM/YYYY")}</span>
    
  </div>

  <div class="field">
    <span class="field-label">Hora: ${dayjs().format("HH:mm a")}</span>
    
  </div>

  <div class="field">
    <span class="field-label">Responsable:</span>
    <span class="line"></span>
  </div>

  <div class="field">
    <span class="field-label">Sucursal:</span>
    <span class="line"></span>
  </div>
</div>

${categories
  .map(
    (category) => `
  <div class="category-section">
    <div class="category-header">${category.categoryName}</div>
    <table class="category-table">
      <thead>
        <tr>
          <th style="width: 50%;">Producto</th>
          <th style="width: 15%;">Stock Sistema</th>
          <th style="width: 15%;">Stock Físico</th>
          <th style="width: 20%;">Dif.</th>
        </tr>
      </thead>
      <tbody>
        ${category.items
          .map(
            (item) => `
          <tr>
            <td>${item.displayName}</td>
            <td class="center">${item.stock}</td>
            <td class="center"></td>
            <td class="center"></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  </div>
    `,
  )
  .join("")}

<div class="observations">
  <h3>Observaciones</h3>

  <div class="obs-line"></div>
  <div class="obs-line"></div>
  <div class="obs-line"></div>
</div>

<div class="signature-section">

  <div class="signature-box">
    <div class="signature-line"></div>
    Responsable de Conteo
  </div>

  <div class="signature-box">
    <div class="signature-line"></div>
    Supervisor
  </div>

</div>

</body>
</html>`;

  return reportLayout;
};
