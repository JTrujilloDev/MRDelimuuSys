import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getAllActiveProducts } from "../../products/services/products.service";
import { socket } from "../../../shared/socket/socket";

interface ActiveProductVariant {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  unit: string;
}

interface ActiveProduct {
  id: number;
  name: string;
  productType: string;
  variants: ActiveProductVariant[];
}

export interface KitchenStockItem {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
}

interface KitchenStockGroups {
  finishedProducts: KitchenStockItem[];
  preparedBases: KitchenStockItem[];
}

const toStockItems = (
  products: ActiveProduct[],
  productType: "FINISHED_PRODUCT" | "PREPARED_BASE",
) =>
  products
    .filter((product) => product.productType === productType)
    .flatMap((product) => {
      const activeVariants = product.variants.filter(
        (variant) => variant.isActive,
      );

      return activeVariants.map((variant) => ({
        id: variant.id,
        name:
          activeVariants.length > 1
            ? `${product.name} · ${variant.name}`
            : product.name,
        stock: variant.stock,
        minStock: variant.minStock,
        unit: variant.unit,
      }));
    })
    .sort(
      (first, second) =>
        first.stock - second.stock ||
        first.name.localeCompare(second.name, "es"),
    );

export const useKitchenStock = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["getAllActiveProducts"],
    queryFn: getAllActiveProducts,
    select: (response): KitchenStockGroups => {
      const products = (response?.data ?? []) as ActiveProduct[];
      return {
        finishedProducts: toStockItems(products, "FINISHED_PRODUCT"),
        preparedBases: toStockItems(products, "PREPARED_BASE"),
      };
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const refreshStock = () => {
      void queryClient.invalidateQueries({
        queryKey: ["getAllActiveProducts"],
      });
    };

    socket.on("inventory:updated", refreshStock);
    return () => {
      socket.off("inventory:updated", refreshStock);
    };
  }, [queryClient]);

  return query;
};
