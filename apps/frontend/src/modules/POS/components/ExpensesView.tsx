import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Receipt } from "lucide-react";
import type { Expense } from "./CloseShiftView";
import { Button, Input, Label, TextArea } from "@heroui/react";


export interface ExpenseFull extends Expense {
  observations: string;
  timestamp: Date;
}

interface ExpensesViewProps {
  expenses: ExpenseFull[];
  onAddExpense: (description: string, amount: number, observations: string) => void;
  onRemoveExpense: (id: string) => void;
  onBack: () => void;
}

const ExpensesView = ({ expenses, onAddExpense, onRemoveExpense, onBack }: ExpensesViewProps) => {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [observations, setObservations] = useState("");

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;
    onAddExpense(description.trim(), parsedAmount, observations.trim());
    setDescription("");
    setAmount("");
    setObservations("");
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
            <h1 className="text-lg font-bold text-foreground">Registro de Gastos</h1>
            <p className="text-xs text-muted-foreground">Gastos del turno actual</p>
          </div>
        </div>
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2">
          <p className="text-xs text-muted-foreground">Total gastos</p>
          <p className="text-lg font-bold text-destructive">${totalExpenses.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left — Form */}
        <div className="flex w-100 shrink-0 flex-col gap-5 border-r border-border/70 bg-pos-surface/35 p-6 lg:w-105 lg:p-7">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Nuevo gasto
          </h2>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expense-desc">Motivo *</Label>
              <Input
                id="expense-desc"
                placeholder="Ej: Compra de servilletas"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">Monto *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="expense-obs">Observaciones</Label>
              <TextArea
                id="expense-obs"
                placeholder="Notas adicionales (opcional)"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                className="min-h-25"
              />
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full mt-auto" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Registrar Gasto
          </Button>
        </div>

        {/* Right — List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Gastos registrados ({expenses.length})
          </h2>

          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No hay gastos registrados en este turno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-xl border border-border bg-secondary/30 p-4 flex items-start justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{exp.description}</p>
                    {exp.observations && (
                      <p className="text-xs text-muted-foreground mt-1">{exp.observations}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {exp.timestamp.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-base font-bold text-destructive whitespace-nowrap">
                      -${exp.amount.toFixed(2)}
                    </span>
                    <button
                      onClick={() => onRemoveExpense(exp.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
