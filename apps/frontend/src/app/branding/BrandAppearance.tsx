import { useLayoutEffect } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useBrand } from "./useBrand";
import { systemBrand } from "./brand";

export default function BrandAppearance() {
  const pointBrand = useBrand();
  const { state } = useAuth();
  const brand = state?.activeContext ? pointBrand : systemBrand;
  const storeName = state?.activeContext?.store.name;

  useLayoutEffect(() => {
    document.documentElement.dataset.brand = brand.key;
    document.title = storeName ? `${storeName} · ${systemBrand.name}` : systemBrand.name;
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) {
      favicon.href = brand.favicon;
      favicon.type = brand.key === "delimuu" ? "image/svg+xml" : "image/png";
    }
  }, [brand, storeName]);

  return null;
}
