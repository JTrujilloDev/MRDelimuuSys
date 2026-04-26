import { useState } from "react";
import { getPrinters } from "../services/qz.service";

export const useQZ = () => {
  const [printers, setPrinters] = useState<any>([]);
  const [loading, setLoading] = useState(false);

  const loadPrinters = async () => {
    try {
      setLoading(true);
      const list = await getPrinters();
      setPrinters(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return {
    printers,
    loading,
    loadPrinters,
  };
};