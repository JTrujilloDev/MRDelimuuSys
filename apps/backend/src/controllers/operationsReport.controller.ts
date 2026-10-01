import { Request, Response } from "express";
import { getOperationsReportService } from "../service/operationsReport.service";

export const getOperationsReport = async (req: Request, res: Response) => {
  try {
    const from = new Date(String(req.query.from));
    const to = new Date(String(req.query.to));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      res.status(400).json({ success: false, message: "A valid date range is required" });
      return;
    }
    const parseId = (value: unknown) => {
      const id = Number(value);
      return Number.isInteger(id) && id > 0 ? id : undefined;
    };
    const granularity =
      req.query.granularity === "WEEK" || req.query.granularity === "MONTH"
        ? req.query.granularity
        : "DAY";
    const data = await getOperationsReportService({
      from,
      to,
      requestedStoreId: parseId(req.query.storeId),
      requestedGroupId: parseId(req.query.groupId),
      activeStoreId: req.auth!.activeStoreId!,
      isGlobalAdmin: req.auth!.isGlobalAdmin,
      granularity,
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};
