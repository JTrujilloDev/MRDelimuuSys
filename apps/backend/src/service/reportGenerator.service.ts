import { getAllActiveProductsService } from "./product.service";
import puppeteer from "puppeteer";
import { POSInventoryReport } from '../../layouts/POSInventoryReport';

export interface StockReportItem {
  productName: string;
  variantName: string;
  displayName: string;
  stock: number;
  categoryName: string;
}

export interface CategoryGroup {
  categoryName: string;
  items: StockReportItem[];
}

export const getStockReportData = async (): Promise<CategoryGroup[]> => {
  const products = await getAllActiveProductsService();

  const items = products.flatMap((product) =>
    product.variants.map((variant) => ({
      productName: product.name,
      variantName: variant.name,
      displayName: `${product.name} ${variant.name}`,
      stock: variant.stock ?? 0,
      categoryName: product.category?.name || "Sin categoría",
    })),
  );

  // Agrupar por categoría
  const groupedByCategory = items.reduce(
    (acc, item) => {
      const existing = acc.find((group) => group.categoryName === item.categoryName);
      if (existing) {
        existing.items.push(item);
      } else {
        acc.push({
          categoryName: item.categoryName,
          items: [item],
        });
      }
      return acc;
    },
    [] as CategoryGroup[],
  );

  // Ordenar categorías alfabéticamente
  return groupedByCategory.sort((a, b) =>
    a.categoryName.localeCompare(b.categoryName),
  );
};



export const generateStockReportPDF = async (): Promise<Buffer> => {
  const categories = await getStockReportData();
  const html = POSInventoryReport(categories);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};