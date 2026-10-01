import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, ChevronDown, X } from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth } from "../../app/auth/AuthProvider";
import { useGetInventoryProducts } from "../../modules/products/hooks/useGetInventoryProducts";
import { productUnits } from "../../shared/constants/productUnits";

interface InventoryLot {
  id: number;
  code: string;
  expiresAt: string | null;
  stock: number;
}

interface InventoryProduct {
  id: number;
  name: string;
  variants: Array<{
    id: number;
    name: string;
    unit: string;
    lots?: InventoryLot[];
  }>;
}

interface ExpirationItem {
  id: string;
  productName: string;
  variantName: string;
  unit: string;
  lotCode: string;
  stock: number;
  days: number;
}

const DAY_IN_MS = 86_400_000;

const getDaysUntilExpiration = (value: string | null) => {
  if (!value) return null;
  const expiration = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.ceil((expiration.getTime() - today) / DAY_IN_MS);
};

const getExpirationLabel = (days: number) => {
  if (days < 0) return `Vencido hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `Vence en ${days} días`;
};

const getUnitLabel = (unit: string) =>
  productUnits.find((option) => option.value === unit)?.label.toLocaleLowerCase("es") ?? unit;

const ExpirationAlert = () => {
  const navigate = useNavigate();
  const { state } = useAuth();
  const productsQuery = useGetInventoryProducts();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
  const storeId = state?.activeContext?.store.id;

  const alerts = useMemo<ExpirationItem[]>(() => {
    const products = (productsQuery.data?.data ?? []) as InventoryProduct[];

    return products
      .flatMap((product) =>
        product.variants.flatMap((variant) =>
          (variant.lots ?? []).flatMap((lot) => {
            const days = getDaysUntilExpiration(lot.expiresAt);
            if (lot.stock <= 0 || days === null || days > 7) return [];

            return [{
              id: `${variant.id}-${lot.id}`,
              productName: product.name,
              variantName: variant.name,
              unit: variant.unit,
              lotCode: lot.code,
              stock: lot.stock,
              days,
            }];
          }),
        ),
      )
      .sort((left, right) => left.days - right.days || left.productName.localeCompare(right.productName, "es"));
  }, [productsQuery.data?.data]);

  const alertSignature = `${storeId ?? ""}|${alerts.map((item) => `${item.id}:${item.days}`).join("|")}`;
  const expiredCount = alerts.filter((item) => item.days < 0).length;
  const upcomingCount = alerts.length - expiredCount;
  const isDismissed = dismissedSignature === alertSignature;

  if (alerts.length === 0 || isDismissed) return null;

  const hasExpiredLots = expiredCount > 0;

  return (
    <aside
      aria-label="Alertas de vencimiento"
      className="fixed right-5 top-5 z-[70] w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-pos-surface/95 text-foreground shadow-2xl backdrop-blur-md"
    >
      <div className={`h-1 ${hasExpiredLots ? "bg-destructive" : "bg-amber-500"}`} />
      <div className="flex items-start gap-3 p-3.5">
        <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${hasExpiredLots ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"}`}>
          {hasExpiredLots ? <AlertTriangle className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
        </span>

        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((current) => !current)}
        >
          <p className="text-sm font-black">
            {hasExpiredLots ? "Inventario con vencimientos" : "Productos próximos a vencer"}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {expiredCount > 0 && `${expiredCount} ${expiredCount === 1 ? "lote vencido" : "lotes vencidos"}`}
            {expiredCount > 0 && upcomingCount > 0 && " · "}
            {upcomingCount > 0 && `${upcomingCount} ${upcomingCount === 1 ? "vence pronto" : "vencen pronto"}`}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label={isExpanded ? "Ocultar detalle" : "Mostrar detalle"}
            onClick={() => setIsExpanded((current) => !current)}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Cerrar alerta"
            onClick={() => setDismissedSignature(alertSignature)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {alerts.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-secondary/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{item.productName} · {item.variantName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Lote {item.lotCode} · {item.stock} {getUnitLabel(item.unit)}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${item.days <= 0 ? "bg-destructive/15 text-destructive" : item.days <= 3 ? "bg-orange-500/15 text-orange-600" : "bg-amber-500/15 text-amber-700"}`}>
                  {getExpirationLabel(item.days)}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full border-t border-border px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/5"
            onClick={() => navigate("/app/inventory?tab=lots")}
          >
            Revisar inventario
          </button>
        </div>
      )}
    </aside>
  );
};

export default ExpirationAlert;
