import {
  Button,
  Chip,
  Input,
  ListBox,
  Select,
} from "@heroui/react";
import dayjs from "dayjs";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FilterX,
  LoaderCircle,
  PackagePlus,
  Search,
  Tags,
} from "lucide-react";
import { useDeferredValue, useState } from "react";
import { transactionTypes } from "../../../shared/constants/inventoryTransactionsByProductType";
import { productUnits } from "../../../shared/constants/productUnits";
import { useGetPOSInventoryTransactions } from "../hooks/useGetPOSInventoryTransactions";
import type {
  InventoryOperation,
  InventoryTransactionItem,
} from "../services/POSInventory.service";

interface InventoryMovementsProps {
  onCreate: () => void;
}

const getTransactionPresentation = (type: string) =>
  Object.values(transactionTypes).find((transaction) => transaction.value === type) ?? {
    label: type,
    value: type,
    className: "bg-muted text-foreground",
  };

const getUnitLabel = (unit: string) =>
  productUnits.find((item) => item.value === unit)?.label ?? unit;

const formatOperationDate = (date: string) => {
  const value = dayjs(date);
  if (value.isSame(dayjs(), "day")) return `Hoy, ${value.format("HH:mm")}`;
  if (value.isSame(dayjs().subtract(1, "day"), "day")) {
    return `Ayer, ${value.format("HH:mm")}`;
  }
  return value.format("DD/MM/YYYY, HH:mm");
};

const getOperationQuantities = (operation: InventoryOperation) => ({
  entries: operation.items
    .filter((item) => item.quantity > 0)
    .reduce((total, item) => total + item.quantity, 0),
  exits: operation.items
    .filter((item) => item.quantity < 0)
    .reduce((total, item) => total + Math.abs(item.quantity), 0),
});

const getProductSummary = (items: InventoryTransactionItem[]) => {
  const uniqueProducts = new Set(
    items.map((item) => item.productVariant.product.id),
  ).size;
  const uniqueVariants = new Set(items.map((item) => item.productVariantId)).size;
  if (items.length === 1) {
    const item = items[0];
    return {
      title: item.productVariant.product.name,
      subtitle: item.productVariant.name,
    };
  }

  const firstItem = items[0];
  if (uniqueProducts === 1) {
    return {
      title: firstItem.productVariant.product.name,
      subtitle: `${uniqueVariants} variantes`,
    };
  }

  return {
    title: `${uniqueProducts} productos`,
    subtitle: `${firstItem.productVariant.product.name} · ${firstItem.productVariant.name}${uniqueProducts > 1 ? " y más" : ""}`,
  };
};

const InventoryMovements = ({ onCreate }: InventoryMovementsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [type, setType] = useState("");
  const [origin, setOrigin] = useState<"ALL" | "MANUAL" | "POS">("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(
    new Set(),
  );

  const { data, isLoading, isFetching, isError } =
    useGetPOSInventoryTransactions({
      search: deferredSearch.trim() || undefined,
      type: type || undefined,
      origin,
      from: from ? dayjs(from).startOf("day").toISOString() : undefined,
      to: to ? dayjs(to).endOf("day").toISOString() : undefined,
      page,
      pageSize,
    });

  const operations = data?.data ?? [];
  const summary = data?.summary ?? {
    operations: 0,
    entriesByUnit: {},
    exitsByUnit: {},
    products: 0,
  };
  const pagination = data?.pagination ?? {
    page: 1,
    pageSize,
    totalOperations: 0,
    totalPages: 1,
  };

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setSearchTerm("");
    setType("");
    setOrigin("ALL");
    setFrom("");
    setTo("");
    setPage(1);
  };
  const hasFilters = Boolean(searchTerm || type || origin !== "ALL" || from || to);

  const toggleOperation = (operationId: string) => {
    setExpandedOperations((current) => {
      const next = new Set(current);
      if (next.has(operationId)) next.delete(operationId);
      else next.add(operationId);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Historial de movimientos</h2>
          <p className="text-sm text-foreground/65">
            Consulta entradas, salidas y operaciones registradas.
          </p>
        </div>
        <Button onClick={onCreate} size="sm">
          <PackagePlus className="mr-1 h-4 w-4" /> Registrar movimientos
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Operaciones" value={summary.operations} icon={Tags} />
        <QuantitySummaryCard
          label="Entradas"
          quantities={summary.entriesByUnit}
          icon={ArrowDownToLine}
          valueClassName="text-emerald-600"
        />
        <QuantitySummaryCard
          label="Salidas"
          quantities={summary.exitsByUnit}
          icon={ArrowUpFromLine}
          valueClassName="text-destructive"
        />
        <SummaryCard label="Productos involucrados" value={summary.products} icon={PackagePlus} />
      </div>

      <div className="rounded-xl border border-border bg-pos-surface-soft p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(15rem,2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(9rem,0.8fr)_minmax(9rem,0.8fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-foreground/55" />
            <Input
              aria-label="Buscar producto o variante"
              className="w-full border border-border bg-background pl-9 text-foreground"
              placeholder="Buscar producto o variante..."
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                resetPage();
              }}
            />
          </div>

          <Select
            aria-label="Filtrar por tipo de movimiento"
            value={type || "all"}
            onChange={(value) => {
              setType(String(value) === "all" ? "" : String(value));
              resetPage();
            }}
          >
            <Select.Trigger className="border border-border bg-background text-foreground">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="rounded-md border border-border bg-pos-surface text-foreground">
              <ListBox>
                <ListBox.Item id="all" textValue="Todos los movimientos">
                  Todos los movimientos
                </ListBox.Item>
                {Object.values(transactionTypes).map((transaction) => (
                  <ListBox.Item
                    id={transaction.value}
                    key={transaction.value}
                    textValue={transaction.label}
                  >
                    {transaction.label}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            aria-label="Filtrar por origen"
            value={origin}
            onChange={(value) => {
              setOrigin(String(value) as "ALL" | "MANUAL" | "POS");
              resetPage();
            }}
          >
            <Select.Trigger className="border border-border bg-background text-foreground">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="rounded-md border border-border bg-pos-surface text-foreground">
              <ListBox>
                <ListBox.Item id="ALL" textValue="Todos los orígenes">Todos los orígenes</ListBox.Item>
                <ListBox.Item id="MANUAL" textValue="Movimientos manuales">Movimientos manuales</ListBox.Item>
                <ListBox.Item id="POS" textValue="Ventas POS">Ventas POS</ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Input
            aria-label="Fecha inicial"
            type="date"
            className="border border-border bg-background text-foreground"
            value={from}
            max={to || undefined}
            onChange={(event) => {
              setFrom(event.target.value);
              resetPage();
            }}
          />
          <Input
            aria-label="Fecha final"
            type="date"
            className="border border-border bg-background text-foreground"
            value={to}
            min={from || undefined}
            onChange={(event) => {
              setTo(event.target.value);
              resetPage();
            }}
          />

          <Button
            aria-label="Limpiar filtros"
            variant="outline"
            className="border-border bg-background text-foreground"
            onClick={clearFilters}
            isDisabled={!hasFilters}
          >
            <FilterX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-pos-surface shadow-sm">
        {isFetching && !isLoading && (
          <div className="absolute right-3 top-3 z-20 rounded-full bg-pos-surface p-1 text-primary shadow">
            <LoaderCircle className="h-4 w-4 animate-spin" />
          </div>
        )}

        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="sticky top-0 z-10 bg-pos-order-bg text-left text-pos-order-fg">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Movimiento</th>
                <th className="px-4 py-3">Producto / Variante</th>
                <th className="px-4 py-3 text-center">Cambio</th>
                <th className="px-4 py-3">Observación</th>
                <th className="w-12 px-3 py-3" aria-label="Detalle" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-foreground/65">
                    <LoaderCircle className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                    Cargando movimientos...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-destructive">
                    No fue posible cargar los movimientos.
                  </td>
                </tr>
              ) : operations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-foreground/65">
                    No se encontraron movimientos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                operations.map((operation) => (
                  <OperationRows
                    key={operation.id}
                    operation={operation}
                    expanded={expandedOperations.has(operation.id)}
                    onToggle={() => toggleOperation(operation.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-pos-surface-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-foreground/65">
            <span>
              Página {pagination.page} de {pagination.totalPages} · {pagination.totalOperations} operaciones
            </span>
            <Select
              aria-label="Operaciones por página"
              value={String(pageSize)}
              onChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <Select.Trigger className="h-8 w-20 border border-border bg-background text-foreground">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className="rounded-md border border-border bg-pos-surface text-foreground">
                <ListBox>
                  {[10, 20, 50].map((size) => (
                    <ListBox.Item id={String(size)} key={size} textValue={String(size)}>
                      {size}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              isIconOnly
              aria-label="Página anterior"
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              isDisabled={pagination.page <= 1 || isFetching}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              isIconOnly
              aria-label="Página siguiente"
              variant="outline"
              onClick={() =>
                setPage((current) => Math.min(pagination.totalPages, current + 1))
              }
              isDisabled={pagination.page >= pagination.totalPages || isFetching}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  value: number;
  icon: typeof Tags;
  valueClassName?: string;
}

const SummaryCard = ({ label, value, icon: Icon, valueClassName = "text-foreground" }: SummaryCardProps) => (
  <div className="flex items-center justify-between rounded-xl border border-border bg-pos-surface p-4">
    <div>
      <p className="text-xs text-foreground/60">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</p>
    </div>
    <span className="rounded-xl bg-primary/10 p-2 text-primary">
      <Icon className="h-5 w-5" />
    </span>
  </div>
);

interface QuantitySummaryCardProps {
  label: string;
  quantities?: Record<string, number>;
  icon: typeof Tags;
  valueClassName: string;
}

const QuantitySummaryCard = ({
  label,
  quantities,
  icon: Icon,
  valueClassName,
}: QuantitySummaryCardProps) => {
  const entries = Object.entries(quantities ?? {});

  return (
    <div className="flex items-start justify-between rounded-xl border border-border bg-pos-surface p-4">
      <div className="min-w-0">
        <p className="text-xs text-foreground/60">{label}</p>
        {entries.length === 0 ? (
          <p className={`mt-1 text-2xl font-bold ${valueClassName}`}>0</p>
        ) : (
          <div className="mt-1 flex flex-col gap-0.5">
            {entries.map(([unit, quantity]) => (
              <p key={unit} className={`font-semibold ${valueClassName}`}>
                <span className="text-lg">{quantity}</span>{" "}
                <span className="text-xs font-medium">
                  {getUnitLabel(unit)}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
      <span className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary">
        <Icon className="h-5 w-5" />
      </span>
    </div>
  );
};

interface OperationRowsProps {
  operation: InventoryOperation;
  expanded: boolean;
  onToggle: () => void;
}

const OperationRows = ({ operation, expanded, onToggle }: OperationRowsProps) => {
  const transaction = getTransactionPresentation(operation.type);
  const quantities = getOperationQuantities(operation);
  const product = getProductSummary(operation.items);
  const operationUnits = Array.from(
    new Set(operation.items.map((item) => item.productVariant.unit)),
  );
  const unitLabel =
    operationUnits.length === 1
      ? getUnitLabel(operationUnits[0]).toLowerCase()
      : "unidades mixtas";

  return (
    <>
      <tr className="border-t border-border bg-pos-surface text-foreground transition-colors hover:bg-pos-surface-soft">
        <td className="whitespace-nowrap px-4 py-3 text-xs" title={dayjs(operation.createdAt).format("DD/MM/YYYY HH:mm:ss")}>
          {formatOperationDate(operation.createdAt)}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col items-start gap-1">
            <Chip className={`text-xs font-medium ${transaction.className}`}>
              {transaction.label}
            </Chip>
            <span className="text-[11px] text-foreground/55">
              {operation.origin === "POS" ? "Venta POS" : "Manual"}
            </span>
          </div>
        </td>
        <td className="max-w-64 px-4 py-3">
          <span className="block truncate font-semibold">{product.title}</span>
          <span className="block truncate text-xs text-foreground/65">{product.subtitle}</span>
        </td>
        <td className="px-4 py-3 text-center">
          <div className="flex flex-col items-center gap-1 whitespace-nowrap">
            <div className="flex items-center justify-center gap-1.5">
              {quantities.entries > 0 && (
                <span className="rounded-md bg-emerald-500/15 px-2 py-1 font-semibold text-emerald-600">
                  +{quantities.entries}
                </span>
              )}
              {quantities.exits > 0 && (
                <span className="rounded-md bg-destructive/10 px-2 py-1 font-semibold text-destructive">
                  −{quantities.exits}
                </span>
              )}
            </div>
            <span className="text-[11px] text-foreground/55">{unitLabel}</span>
          </div>
        </td>
        <td className="max-w-52 px-4 py-3" title={operation.observation ?? undefined}>
          <span className="block truncate text-foreground/75">
            {operation.observation || "Sin observación"}
          </span>
        </td>
        <td className="px-3 py-3">
          <Button
            isIconOnly
            aria-label={expanded ? "Ocultar detalle" : "Ver detalle"}
            variant="ghost"
            onClick={onToggle}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </td>
      </tr>

      {expanded && (
        <tr className="border-t border-border bg-pos-surface-soft">
          <td colSpan={6} className="px-5 py-4">
            <div className="overflow-hidden rounded-lg border border-border bg-pos-surface">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left text-xs text-foreground/70">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Variante</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2">Unidad</th>
                    <th className="px-3 py-2">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {operation.items.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{item.productVariant.product.name}</td>
                      <td className="px-3 py-2 text-foreground/70">{item.productVariant.name}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${item.quantity > 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {item.quantity > 0 ? `+${item.quantity}` : item.quantity}
                      </td>
                      <td className="px-3 py-2 text-foreground/70">
                        {getUnitLabel(item.productVariant.unit)}
                      </td>
                      <td className="max-w-64 truncate px-3 py-2 text-foreground/70" title={item.observation ?? undefined}>
                        {item.observation || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default InventoryMovements;
