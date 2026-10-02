import { useLayoutEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useBrand } from "./useBrand";

export default function BrandAppearance() {
  const brand = useBrand();
  const { state } = useAuth();
  const storeName = state?.activeContext?.store.name;

  useLayoutEffect(() => {
    document.documentElement.dataset.brand = brand.key;
    document.title = storeName ? `${storeName} · POS` : "Deli POS";
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = brand.favicon;
      favicon.type = brand.key === "veleno" ? "image/png" : "image/svg+xml";
    }
  }, [brand, storeName]);

  return null;
}
