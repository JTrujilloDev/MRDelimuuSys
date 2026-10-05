import { useState, useMemo } from "react";
import axios from "axios";
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

import { Button, Input, Label, toast } from "@heroui/react";
import DenominationCounter, {
  BILL_DENOMINATIONS,
  COIN_DENOMINATIONS,
} from "./DenominationCounter";
import type { Shift } from "./ShiftGate";
import dayjs from "dayjs";
import numeral from "numeral";
import { useCloseCashRegister } from "../hooks/cashRegister/useCloseCashRegister";
import { useGetExpenses } from "../hooks/financialTransaction/useGetExpenses";
import InventoryCountView, { InventoryCountStatus } from "./InventoryCountView";
import { calculateCashCount } from "../utils/cashCount.rules";

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
  adjustmentJustification?: string;
  timestamp?: Date;
}

interface CloseShiftViewProps {
  shift: Shift;
  cashRegisterId: number;
  onConfirmClose: () => void;
  onBack: () => void;
}

const getCloseShiftErrorMessage = (error: unknown) => {
  const serverMessage = axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message
    : undefined;
  const openAccountsMatch = serverMessage?.match(
    /Cannot close the shift with (\d+) open account/i,
  );

  if (openAccountsMatch) {
    const openAccounts = Number(openAccountsMatch[1]);
    return openAccounts === 1
      ? "No puedes cerrar el turno porque hay una cuenta abierta. Ciérrala o anúlala antes de continuar."
      : `No puedes cerrar el turno porque hay ${openAccounts} cuentas abiertas. Ciérralas o anúlalas antes de continuar.`;
  }

  return serverMessage ?? "No fue posible cerrar el turno. Inténtalo nuevamente.";
};

// Denominations imported from DenominationCounter

const CloseShiftView = ({
  shift,
  cashRegisterId,
  onConfirmClose,
  onBack,
}: CloseShiftViewProps) => {
  const { mutate: closeCashRegister, isPending: isClosingShift } =
    useCloseCashRegister();
  const expensesQuery = useGetExpenses(cashRegisterId);
  const expenses = (expensesQuery.data?.data.data ?? []).filter(item => !item.voidedAt);
  const [billCounts, setBillCounts] = useState<Record<number, string>>({});
  const [differenceJustification, setDifferenceJustification] = useState("");
  const [closeError, setCloseError] = useState<string | null>(null);
  const [showInventoryCount, setShowInventoryCount] = useState(false);

  // Sales breakdown
  const totalSales = shift.totalSales;
  const grossSales = totalSales + shift.totalDiscounts;
  const cashSales = shift.cashAmount;
  const cardSales = shift.cardAmount;
  const qrSales = shift.qrAmount;
  const totalDiscounts = shift.totalDiscounts;
  const totalExpenses = shift.totalExpenses;
  const discountedSales = (shift.accounts ?? []).filter(
    (account) => account.status === "CLOSED" && account.discount > 0,
  );
  const visibleDiscounts = discountedSales.slice(0, 3);
  const visibleExpenses = expenses.slice(0, 3);

  // Expected cash = initial + cash sales - expenses
  const expectedCash = shift.expectedCash;

  // Counted cash from bills/coins
  const counted = useMemo(() => calculateCashCount(billCounts, [...BILL_DENOMINATIONS, ...COIN_DENOMINATIONS]), [billCounts]);
  const countedCash = counted.total;

  const difference = countedCash - expectedCash;

  if (showInventoryCount) return <InventoryCountView cashRegisterId={cashRegisterId} initialPhase="CLOSING" onBack={() => setShowInventoryCount(false)} />;

  return (
    <div className="flex h-full flex-col bg-background">
      <InventoryCountStatus cashRegisterId={cashRegisterId} onOpen={() => setShowInventoryCount(true)} />
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
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:p-5">
          {/* Summary cards */}
          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resumen de ventas
            </h2>
            <div className="grid grid-cols-4 gap-2">
              <SummaryCard
                icon={Receipt}
                label="Ventas brutas"
                value={grossSales}
                color="text-primary"
              />
              <SummaryCard
                icon={TrendingUp}
                label="Ventas netas"
                value={totalSales}
                color="text-success"
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
              <SummaryCard icon={Receipt} label="Ventas a crédito" value={shift.creditAmount} color="text-primary" />
              <SummaryCard
                icon={Minus}
                label="Gastos"
                value={totalExpenses}
                color="text-destructive"
                negative
              />
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
          <section className="overflow-hidden rounded-xl border border-border bg-secondary/20 p-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recaudo de créditos
              </h2>
              <p className="text-xl font-bold text-foreground">{numeral(shift.creditCollections || 0).format("$ 0,0")}</p>
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex justify-between gap-2"><span>Efectivo</span><strong className="text-foreground">{numeral(shift.cashCreditCollections || 0).format("$ 0,0")}</strong></p>
                <p className="flex justify-between gap-2"><span>Tarjeta</span><strong className="text-foreground">{numeral(shift.cardCreditCollections || 0).format("$ 0,0")}</strong></p>
                <p className="flex justify-between gap-2"><span>QR</span><strong className="text-foreground">{numeral(shift.qrCreditCollections || 0).format("$ 0,0")}</strong></p>
              </div>
              <p className="mt-3 border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">Solo el efectivo se suma a la caja esperada.</p>
            </section>

            <section className="overflow-hidden rounded-xl border border-border bg-secondary/20 p-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descuentos justificados
              </h2>
            <div className="space-y-1.5">
              {discountedSales.length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Sin descuentos registrados
                </p>
              )}
              {visibleDiscounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-start justify-between gap-2 rounded-lg bg-background/50 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">{account.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {account.discountObservation}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-orange-500">
                    -{numeral(account.discount).format("$ 0,0")}
                  </span>
                </div>
              ))}
              {discountedSales.length > visibleDiscounts.length && <p className="pt-1 text-xs font-medium text-muted-foreground">+ {discountedSales.length - visibleDiscounts.length} descuentos adicionales</p>}
            </div>
          </section>

          {/* Expenses section (read-only) */}
          <section className="overflow-hidden rounded-xl border border-border bg-secondary/20 p-3">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gastos del turno
            </h2>
            <div className="space-y-1.5">
              {expenses.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Sin gastos registrados
                </p>
              )}
              {visibleExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-background/50 px-2.5 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-foreground">
                      {exp.description}
                    </p>
                    {exp.adjustmentJustification && (
                      <p className="truncate text-[11px] text-muted-foreground">
                        {exp.adjustmentJustification}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs font-medium text-destructive">
                    {numeral(exp.amount).format("$ 0,0")}
                  </span>
                </div>
              ))}
              {expenses.length > visibleExpenses.length && <p className="pt-1 text-xs font-medium text-muted-foreground">+ {expenses.length - visibleExpenses.length} gastos adicionales</p>}
            </div>
          </section>
          </div>
        </div>

        {/* Right — Bill counting */}
        <div className="flex w-[34rem] shrink-0 flex-col overflow-hidden border-l border-border/70 bg-pos-surface/35 p-4 lg:p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conteo de caja
          </h2>

          <DenominationCounter
            billCounts={billCounts}
            setBillCounts={setBillCounts}
            compact
          />

          {/* Discrepancy */}
          <div
            className={`mt-4 rounded-xl border p-3 ${
              Math.abs(difference) < 0.01
                ? "border-green-500/30 bg-green-500/5"
                : "border-destructive/30 bg-destructive/5"
            }`}
          >
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground">Esperado</p>
                <p className="text-base font-bold text-foreground">{numeral(expectedCash).format("$ 0,0")}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Contado</p>
                <p className="text-base font-bold text-foreground">{numeral(countedCash).format("$ 0,0")}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Diferencia</p>
                <div className="flex items-center justify-center gap-1">
                  {Math.abs(difference) < 0.01 ? <TrendingUp className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  <p className={`text-base font-bold ${Math.abs(difference) < 0.01 || difference > 0 ? "text-green-500" : "text-destructive"}`}>
                    {difference >= 0 ? "+" : ""} {numeral(difference).format("$ 0,0")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {Math.abs(difference) >= 0.01 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <Label htmlFor="cash-difference-justification">
                Justificación del descuadre
              </Label>
              <Input
                id="cash-difference-justification"
                value={differenceJustification}
                onChange={(event) => setDifferenceJustification(event.target.value)}
                placeholder="Explica el faltante o sobrante"
              />
              {!differenceJustification.trim() && (
                <p className="text-xs text-destructive">
                  La justificación es obligatoria para cerrar el turno.
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            {closeError && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{closeError}</p>
              </div>
            )}
            <Button
              onClick={() => {
                setCloseError(null);
                closeCashRegister(
                  {
                    cashRegisterId: shift.id,
                    closingAmount: countedCash,
                    expectedCash,
                    differenceJustification: differenceJustification.trim(),
                  },
                  {
                    onSuccess: () => {
                      onConfirmClose();
                    },
                    onError: (error) => {
                      expensesQuery.refetch();
                      const message = getCloseShiftErrorMessage(error);
                      setCloseError(message);
                      toast("No se pudo cerrar el turno", {
                        variant: "danger",
                        description: message,
                      });
                    },
                  },
                );
              }}
              className="w-full py-6 text-base font-bold"
              size="lg"
              isDisabled={
                isClosingShift ||
                !counted.valid ||
                !Number.isFinite(expectedCash) || expensesQuery.isPending || expensesQuery.isError ||
                (Math.abs(difference) >= 0.01 && !differenceJustification.trim())
              }
            >
              {isClosingShift ? "Cerrando turno..." : "Confirmar Cierre de Turno"}
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
