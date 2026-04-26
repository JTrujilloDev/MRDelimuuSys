import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Banknote,
  CreditCard,
  QrCode,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Tag,
  Minus,
} from "lucide-react";

import { Button, Input } from "@heroui/react";
import type { Shift } from "./ShiftGate";
import dayjs from "dayjs";
import numeral from "numeral";
import { useCloseCashRegister } from "../hooks/cashRegister/useCloseCashRegister";

export interface CompletedSale {
  id: string;
  total: number;
  discount: number;
  paymentMethod: "cash" | "card" | "qr";
  timestamp: Date;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  observations?: string;
  timestamp?: Date;
}

interface CloseShiftViewProps {
  shift: Shift;
  expenses: Expense[];
  onConfirmClose: () => void;
  onBack: () => void;
}

const BILL_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000];
const COIN_DENOMINATIONS = [1000, 500, 200, 100, 50];

const CloseShiftView = ({
  shift,
  expenses,
  onConfirmClose,
  onBack,
}: CloseShiftViewProps) => {
  const { mutate: closeCashRegister } = useCloseCashRegister();
  const [billCounts, setBillCounts] = useState<Record<number, string>>({});

  // Sales breakdown
  const totalSales = shift.totalSales;
  const cashSales = shift.cashAmount;
  const cardSales = shift.cardAmount;
  const qrSales = shift.qrAmount;
  const totalDiscounts = shift.totalDiscounts;
  const totalExpenses = shift.totalExpenses;

  // Expected cash = initial + cash sales - expenses
  const expectedCash = shift.openingAmount + cashSales - totalExpenses;

  // Counted cash from bills/coins
  const countedCash = useMemo(() => {
    return [...BILL_DENOMINATIONS, ...COIN_DENOMINATIONS].reduce(
      (sum, denom) => {
        const count = parseInt(billCounts[denom] || "0") || 0;
        return sum + denom * count;
      },
      0,
    );
  }, [billCounts]);

  const difference = countedCash - expectedCash;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/70 bg-pos-surface/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">
              Cierre de Turno
            </h1>
            <p className="text-xs text-muted-foreground">
              Abierto el {dayjs(shift.openedAt).format(" DD/MM - HH:mm")} ·
              Fondo: {numeral(shift.openingAmount).format("$ 0,0")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Sales summary */}
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 lg:p-7">
          {/* Summary cards */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Resumen de ventas
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                icon={Receipt}
                label="Ventas totales"
                value={totalSales}
                color="text-primary"
              />
              <SummaryCard
                icon={Banknote}
                label="Efectivo"
                value={cashSales}
                color="text-green-500"
              />
              <SummaryCard
                icon={CreditCard}
                label="Tarjeta"
                value={cardSales}
                color="text-blue-500"
              />
              <SummaryCard
                icon={QrCode}
                label="QR"
                value={qrSales}
                color="text-violet-500"
              />
              <SummaryCard
                icon={Tag}
                label="Descuentos"
                value={totalDiscounts}
                color="text-orange-500"
                negative
              />
              <SummaryCard
                icon={Minus}
                label="Gastos"
                value={totalExpenses}
                color="text-destructive"
                negative
              />
            </div>
          </div>

          {/* Expenses section (read-only) */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Gastos del turno
            </h2>
            <div className="space-y-2">
              {expenses.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Sin gastos registrados
                </p>
              )}
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
                >
                  <div>
                    <span className="text-sm text-foreground">
                      {exp.description}
                    </span>
                    {exp.observations && (
                      <p className="text-xs text-muted-foreground">
                        {exp.observations}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-medium text-destructive">
                    -${exp.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Discrepancy */}
          <div
            className={`rounded-xl border-2 p-5 ${
              Math.abs(difference) < 0.01
                ? "border-green-500/30 bg-green-500/5"
                : "border-destructive/30 bg-destructive/5"
            }`}
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Diferencia / Descuadre
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Esperado en caja
                </p>
                <p className="text-xl font-bold text-foreground">
                  {numeral(expectedCash).format("$ 0,0")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Contado en caja
                </p>
                <p className="text-xl font-bold text-foreground">
                  {numeral(countedCash).format("$ 0,0")}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
                <div className="flex items-center justify-center gap-1.5">
                  {Math.abs(difference) < 0.01 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <p
                    className={`text-xl font-bold ${
                      Math.abs(difference) < 0.01
                        ? "text-green-500"
                        : difference > 0
                          ? "text-green-500"
                          : "text-destructive"
                    }`}
                  >
                    {difference >= 0 ? "+" : ""}{" "}
                    {numeral(difference).format("$ 0,0")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Bill counting */}
        <div className="flex w-95 shrink-0 flex-col overflow-y-auto border-l border-border/70 bg-pos-surface/35 p-6 lg:w-100 lg:p-7">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Conteo de caja
          </h2>

          <div className="space-y-1.5 mb-4">
            <p className="text-xs text-muted-foreground">Billetes</p>
            {BILL_DENOMINATIONS.map((denom) => (
              <div key={denom} className="flex items-center gap-3">
                <span className="w-16 text-sm font-medium text-foreground text-right">
                  {numeral(denom).format("0,0")}
                </span>
                <span className="text-muted-foreground text-sm">×</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={billCounts[denom] || ""}
                  onChange={(e) =>
                    setBillCounts((prev) => ({
                      ...prev,
                      [denom]: e.target.value,
                    }))
                  }
                  className="w-20 text-center h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground w-20 text-right">
                  = $
                  {numeral(
                    (parseInt(billCounts[denom] || "0") || 0) * denom,
                  ).format("0,0")}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 mb-6">
            <p className="text-xs text-muted-foreground">Monedas</p>
            {COIN_DENOMINATIONS.map((denom) => (
              <div key={denom} className="flex items-center gap-3">
                <span className="w-16 text-sm font-medium text-foreground text-right">
                  ${numeral(denom).format("0,0")}
                </span>
                <span className="text-muted-foreground text-sm">×</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={billCounts[denom] || ""}
                  onChange={(e) =>
                    setBillCounts((prev) => ({
                      ...prev,
                      [denom]: e.target.value,
                    }))
                  }
                  className="w-20 text-center h-8 text-sm"
                />
                <span className="text-sm text-muted-foreground w-20 text-right">
                  = $
                  {numeral(
                    (parseInt(billCounts[denom] || "0") || 0) * denom,
                  ).format("0,0")}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-secondary/50 p-4 text-center mb-6">
            <p className="text-xs text-muted-foreground mb-1">Total contado</p>
            <p className="text-2xl font-bold text-foreground">
              {" "}
              ${numeral(countedCash).format("0,0")}
            </p>
          </div>

          <div className="mt-auto">
            <Button
              onClick={()=>{
                closeCashRegister({
                  cashRegisterId: shift.id,
                  closingAmount: countedCash,
                },{
                  onSuccess: () => {                    onConfirmClose();
                  onConfirmClose();
                  }
                })
              }}
              className="w-full py-6 text-base font-bold"
              size="lg"
            >
              Confirmar Cierre de Turno
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  count,
  color,
  negative,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  count?: number;
  color: string;
  negative?: boolean;
}) => (
  <div className="rounded-xl bg-secondary/50 border border-border p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <p className={`text-lg font-bold text-foreground`}>
      {negative ? "-" : ""} {numeral(value).format("$ 0,0")}
    </p>
    {count !== undefined && (
      <p className="text-xs text-muted-foreground">{count} transacciones</p>
    )}
  </div>
);

export default CloseShiftView;
