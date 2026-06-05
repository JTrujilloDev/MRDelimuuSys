import { Building, CakeSlice, Cuboid, ListCheck, Milk } from "lucide-react";
export const productTypes = [
  {
    label: "Ingrediente",
    value: "INGREDIENT",
    color: "bg-emerald-500/15 text-emerald-500",
    icon: Milk,
  },
  {
    label: "Producto terminado",
    value: "FINISHED_PRODUCT",
    color: "bg-sky-500/15 text-sky-500",
    icon: CakeSlice,
  },
  {
    label: "Base preparada",
    value: "PREPARED_BASE",
    color: "bg-amber-500/15 text-amber-500",
    icon: Cuboid,
  },
  {
    label: "Producto con receta",
    value: "RECIPE_PRODUCT",
    color: "bg-violet-500/15 text-violet-500",
    icon: ListCheck,
  },
  {
    label: "Producto de terceros",
    value: "THIRD_PARTY_PRODUCT",
    color: "bg-rose-500/15 text-rose-500",
    icon: Building,
  }
];
