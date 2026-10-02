export const brands = {
  delimuu: { key: "delimuu", name: "Delimuu", logo: "/DeliLogo.png", favicon: "/favicon.svg" },
  veleno: { key: "veleno", name: "Veleño", logo: "/branding/veleno-logo.png", favicon: "/branding/veleno-logo.png" },
} as const;

export const systemBrand = {
  key: "delisys", name: "Delisys", logo: "/branding/delisys-logo.png", favicon: "/branding/delisys-logo.png",
} as const;

// Use the stable business-group code, never a store name or a database ID.
export const resolveBrand = (groupCode?: string) => {
  const code = groupCode?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  return code === "VELENO" ? brands.veleno : brands.delimuu;
};
