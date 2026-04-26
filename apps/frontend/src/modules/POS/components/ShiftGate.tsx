import { useState } from "react";
import { DollarSign, Clock, LogOut } from "lucide-react";
import { Button, Input, Label } from "@heroui/react";
import dayjs from "dayjs";
import { printTest } from "../../../shared/services/qz.service";

export interface Shift {
  id: number;
  userId: number;
  terminalId: number;
  openedAt: Date;
  closedAt: null;
  openingAmount: number;
  closingAmount: null;
  difference: null;
  status: string;
  totalSales: number;
  totalDiscounts: number;
  totalExpenses: number;
  cashAmount: number;
  cardAmount: number;
  qrAmount: number;
  creditAmount: number;
}

interface ShiftGateProps {
  activeShift: Shift | null;
  onOpenShift: (initialAmount: number) => void;
  onCloseShift: () => void;
  children: React.ReactNode;
}

const ShiftGate = ({ activeShift, onOpenShift, children }: ShiftGateProps) => {
  const [amount, setAmount] = useState("");

  if (activeShift) {
    return <>{children}</>;
  }

  const handleOpen = () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) return;
    onOpenShift(parsed);
    setAmount("");
  };

  return (
    <div className="flex h-full items-center justify-center bg-background px-4 py-6 sm:p-6">
      <div className="w-full max-w-md rounded-[28px] border border-border/80 bg-pos-surface p-8 shadow-[0_24px_60px_-38px_rgba(84,56,32,0.5)] sm:p-9">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-primary/10 text-primary">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            Abrir turno
          </h1>
          <p className="text-center text-sm text-muted-foreground">
            Ingresa el monto inicial de caja para comenzar la jornada.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2 flex flex-col">
            <Label htmlFor="initial-amount">Monto inicial de caja</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="initial-amount"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOpen()}
                className=" w-full pl-9 text-lg font-medium tracking-wide text-foreground"
              />
            </div>
          </div>

          <Button
            onClick={handleOpen}
            className="w-full"
            size="lg"
            isDisabled={
              !amount.trim() ||
              isNaN(parseFloat(amount)) ||
              parseFloat(amount) < 0
            }
          >
            Abrir Turno
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShiftGate;

export const ShiftBanner = ({
  shift,
  onClose,
  onExpenses,
}: {
  shift: Shift;
  onClose: () => void;
  onExpenses?: () => void;
}) => (
  <div className="mx-6 mt-4 flex items-center justify-between rounded-[20px] border border-primary/20 bg-pos-surface px-4 py-3 shadow-sm">
    <div className="flex items-center gap-3 text-sm">
      <Clock className="h-4 w-4 text-primary" />
      <span className="text-muted-foreground">
        Turno abierto a el{" "}
        <span className="font-semibold text-foreground">
          {dayjs(shift.openedAt).format(" DD/MM - HH:mm")}
        </span>
      </span>
    </div>
    <div className="flex items-center gap-2">
      {onExpenses && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpenses}
          className="text-muted-foreground hover:text-foreground gap-1.5"
        >
          <DollarSign className="h-3.5 w-3.5" />
          Gastos
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
      >
        <LogOut className="h-3.5 w-3.5" />
        Cerrar Turno
      </Button>
      <button
        onClick={() => {
          printTest("XP-58");
        }}
      >
        PRINT
      </button>
    </div>
  </div>
);
