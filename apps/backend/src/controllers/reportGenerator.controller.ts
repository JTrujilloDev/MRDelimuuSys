import { Request, Response } from "express";
import { getStockReportData, generateStockReportPDF } from "../service/reportGenerator.service";

export const getStockReport = async (req: Request, res: Response) => {
  try {
    const reportData = await getStockReportData();
    return res.json(reportData);
  } catch (error) {
    console.error("Error generando reporte de stock:", error);
    return res.status(500).json({ error: "Error generando reporte de stock" });
  }
};

export const getStockReportPdf = async (req: Request, res: Response) => {
  try {
    const pdfBuffer = await generateStockReportPDF();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=stock-report.pdf",
    );
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generando PDF de reporte de stock:", error);
    return res.status(500).json({ error: "Error generando PDF de reporte de stock" });
  }
};
