import { useRef, useState } from "react";
import { ArrowLeft, Plus, Receipt, Trash2 } from "lucide-react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { voidExpense } from "../services/financialTransaction.service";
import { newRequestKey } from "../../../shared/utils/requestKey";
import type { Expense } from "./CloseShiftView";
import { Button, Input, Label, toast } from "@heroui/react";
import { useCreateExpense } from "../hooks/financialTransaction/useCreateExpense";
import { useGetExpenses } from "../hooks/financialTransaction/useGetExpenses";
import dayjs from "dayjs";
import numeral from "numeral";

export interface ExpenseFull extends Expense {
  adjustmentJustification: string;
  timestamp: Date;
}

interface ExpensesViewProps {
  cashRegisterId: number;
  onBack: () => void;
}

const ExpensesView = ({ cashRegisterId, onBack }: ExpensesViewProps) => {
  const { mutate: createExpense, isPending: isCreating } = useCreateExpense();
  const expensesQuery = useGetExpenses(cashRegisterId);
  const expenses = expensesQuery.data?.data.data ?? [];
  const queryClient = useQueryClient();
  const [voidingId, setVoidingId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const voidMutation = useMutation({ mutationFn: voidExpense,
    onSuccess: async () => {
      setVoidingId(null); setVoidReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses", cashRegisterId] }),
        queryClient.invalidateQueries({ queryKey: ["openCashRegister"] }),
      ]);
      toast("Gasto anulado", { variant: "success" });
    },
    onError: error => toast("No se pudo anular el gasto", { variant: "danger", description: axios.isAxiosError(error) ? error.response?.data?.message : "Inténtalo nuevamente" }),
  });

  const [description, setDescription] = useState("");
  const [observation, setObservation] = useState("");
  const [amount, setAmount] = useState("");
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.voidedAt ? 0 : Math.abs(e.amount)), 0);

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (isCreating || !description.trim() || !observation.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    const fingerprint = JSON.stringify([cashRegisterId, description.trim(), observation.trim(), parsedAmount]);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: newRequestKey() };
    createExpense(
      {
        description,
        observation,
        amount: parsedAmount,
        cashRegisterId,
        requestKey: request.current.key,
      },
      {
        onSuccess: () => {
          toast("Gasto registrado exitosamente", { variant: "success" });
          setDescription("");
          setObservation("");
          setAmount("");
          request.current = null;
        },
        onError: () => {
          toast("Error al registrar el gasto", { variant: "danger" });
        },
      },
    );
  };

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
              Registro de Gastos
            </h1>
            <p className="text-xs text-muted-foreground">
              Gastos del turno actual
            </p>
          </div>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2">
          <p className="text-xs text-muted-foreground">Total gastos</p>
          <p className="text-lg font-bold text-destructive">
            {numeral(totalExpenses).format("$ 0,0")}
          </p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Form */}
        <div className="flex w-100 shrink-0 flex-col gap-5 border-r border-border/70 bg-pos-surface/35 p-6 lg:w-105 lg:p-7">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Nuevo gasto
          </h2>

          <div className="space-y-4">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="expense-observation">Observación</Label>
              <Input
                id="expense-observation"
                placeholder="Explica por qué fue necesario"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="expense-desc">Motivo</Label>
              <Input
                id="expense-desc"
                placeholder="Ej: Compra de servilletas"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label htmlFor="expense-amount">Monto</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full mt-auto"
            size="lg"
            isDisabled={isCreating || voidMutation.isPending || !description.trim() || !observation.trim() || !Number.isFinite(Number(amount)) || !(Number(amount) > 0)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isCreating ? "Guardando..." : "Registrar Gasto"}
          </Button>
        </div>

        {/* Right — List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Gastos registrados ({expenses?.length})
          </h2>

          {expensesQuery.isError && <p role="alert" className="mb-3 text-destructive">No fue posible cargar los gastos. <button onClick={() => expensesQuery.refetch()}>Reintentar</button></p>}
          {expensesQuery.isPending && <p>Cargando gastos...</p>}
          {!expensesQuery.isPending && !expensesQuery.isError && expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No hay gastos registrados en este turno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...expenses].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-xl border border-border bg-secondary/30 p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {exp.description}
                      {exp.voidedAt && <span className="ml-2 rounded bg-muted px-2 py-1 text-xs">Anulado</span>}
                    </p>
                    {exp.adjustmentJustification && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {exp.adjustmentJustification}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                     
                      {dayjs(exp.createdAt).format("HH:mm ")}
                    </p>
                    {exp.voidedAt && <p className="mt-2 text-xs text-muted-foreground">Motivo de anulación: {exp.voidReason}</p>}
                    {voidingId === exp.id && <div className="mt-3 flex flex-col gap-2">
                      <Label htmlFor={`void-expense-${exp.id}`}>Motivo de anulación</Label>
                      <Input id={`void-expense-${exp.id}`} value={voidReason} onChange={event => setVoidReason(event.target.value)} placeholder="Ej.: gasto registrado dos veces" />
                      <div className="flex gap-2">
                        <Button variant="danger" isDisabled={!voidReason.trim() || voidMutation.isPending} onClick={() => voidMutation.mutate({ id: exp.id, cashRegisterId, reason: voidReason })}>Confirmar anulación</Button>
                        <Button isDisabled={voidMutation.isPending} onClick={() => setVoidingId(null)}>Conservar gasto</Button>
                      </div>
                    </div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-destructive whitespace-nowrap">
                      {numeral(Math.abs(exp.amount)).format("$ 0,0")}
                    </span>
                    {!exp.voidedAt && <Button aria-label={`Anular gasto ${exp.description}`} isDisabled={voidMutation.isPending || isCreating} onClick={() => { setVoidingId(exp.id); setVoidReason(""); }}><Trash2 className="h-4 w-4" />Anular</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpensesView;
