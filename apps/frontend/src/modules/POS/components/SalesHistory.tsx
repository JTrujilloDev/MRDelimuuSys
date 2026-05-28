import { useMemo, useState } from "react";
import {
  Banknote,
  CreditCard,
  QrCode,
  Receipt,
  Printer,
  Search,
  Eye,
  Tag,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { printTicketService } from "../../../shared/services/qz.service";
import { Input } from "@heroui/react/input";
import { Button, Modal } from "@heroui/react";
import type { OrderItem } from "./OrderPanel";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import numeral from "numeral";

const methodMeta = {
  CASH: { label: "Efectivo", icon: Banknote, color: "text-green-500" },
  CARD: { label: "Tarjeta", icon: CreditCard, color: "text-blue-500" },
  QR: { label: "QR", icon: QrCode, color: "text-violet-500" },
} as const;

export interface Sale {
  id: string;
  name: string;
  total: number;
  discount: number;
  paymentMethod: "CASH" | "CARD" | "QR";
  closedAt: Dayjs | null;
  tableLabel: string;
  accountItems: OrderItem[];
}

const SalesHistory = ({
  sales,
  onBack,
}: {
  sales: Sale[];
  onBack: () => void;
}) => {
  const [filter, setFilter] = useState<"all" | "CASH" | "CARD" | "QR">("all");
  const [search, setSearch] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  dayjs.extend(relativeTime);
  const filtered = useMemo(
    () =>
      sales.filter((s) => {
        const m = filter === "all" || s.paymentMethod === filter;
        const q =
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) 
        return m && q;
      }),
    [sales, filter, search],
  );

  const total = useMemo(
    () => filtered.reduce((s, x) => s + x.total, 0),
    [filtered],
  );

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Historial de ventas
          </h1>
          <p className="text-xs text-muted-foreground">
            Ventas realizadas durante el turno actual
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por mesa o ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "CASH", "CARD", "QR"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === k
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? "Todos" : methodMeta[k].label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-bold text-foreground">
            {numeral(total).format("$ 0,0")}
          </span>
          <span className="text-muted-foreground">
            {" "}
            · {filtered.length} ventas
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Receipt className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">No hay ventas registradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => {
              const Meta = methodMeta[s.paymentMethod];

              const Icon = Meta.icon;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-secondary/30 p-4"
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-secondary ${Meta.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {s.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · {Meta.label}
                      </span>
                      {s.discount > 0 && (
                        <span className="text-xs text-orange-500">
                          · Desc. ${s.discount.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {dayjs(s.closedAt).fromNow()} ·{" "}
                      {s.accountItems.reduce((a, i) => a + i.quantity, 0)} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      {numeral(s.total).format("$0,0")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSale(s)}
                      className="gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detalle
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SaleDetailDialog
        sale={selectedSale}
        onClose={() => setSelectedSale(null)}
      />
    </div>
  );
};

const SaleDetailDialog = ({
  sale,
  onClose,
}: {
  sale: Sale | null;
  onClose: () => void;
}) => {
  if (!sale) return null;
  const Meta = methodMeta[sale.paymentMethod];
  const Icon = Meta.icon;

  return (
    <Modal>
      <Modal.Backdrop isOpen={!!sale}>
        <Modal.Container size="lg">
          <Modal.Dialog className="w-full max-w-2xl rounded-[28px] bg-pos-surface">
            <Modal.Header className="flex border-b border-border px-6 py-4 flex-row justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-secondary ${Meta.color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">
                    {sale.name}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground">
                    Pago con {Meta.label}
                  </p>
                </div>
              </div>

              <div className="text-xs ">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {dayjs(sale.closedAt).format("DD/MM/YYYY - HH:mm")}
                  </span>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Items */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Productos (
                    {sale.accountItems.reduce((a, i) => a + i.quantity, 0)})
                  </h3>
                  <div className="space-y-1.5 rounded-xl bg-secondary/40 p-3">
                    {sale.accountItems.map((i) => (
                      <div key={i.id} className="flex justify-between text-sm">
                        <span className="text-foreground">
                          <span className="text-muted-foreground">
                            {i.quantity}×
                          </span>{" "}
                          {i.productName}
                        </span>
                        <span className="font-medium text-foreground">
                          {numeral(i.price * i.quantity).format("$0,0")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-1.5 ">
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-sm text-orange-500">
                      <span className="flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" />
                        Descuento
                      </span>
                      <span>{numeral(sale.discount).format("$0,0")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>{numeral(sale.total).format("$0,0")}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 px-6 py-4 border-t border-border bg-secondary/20">
                <Button variant="outline" className="flex-1" onClick={onClose}>
                  Cerrar
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() =>
                    printTicketService("XP-58", {
                      clientName: "",
                      total: sale.total,
                      idType: "",
                      idNumber: "",
                      email: "",
                      phone: "",
                      date: dayjs(sale.closedAt).format("DD/MM/YYYY - HH:mm"),
                      items: sale.accountItems,
                    })
                  }
                >
                  <Printer className="h-4 w-4" />
                  Reimprimir
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default SalesHistory;
