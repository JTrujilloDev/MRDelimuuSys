import { Plus, Trash2, ShoppingBag, Pencil, Check, ChefHat } from "lucide-react";
import numeral from "numeral";
import { useState } from "react";
import type { KitchenTicket } from "../../../shared/kitchen/kitchenTickets.store";

interface Account {
  accountItems: AccountItem[];
  id: number;
  name:  string;
  status:  string;
  terminalId: number;
  total: number;
}

interface AccountItem {
  id: number;
  name:  string;
  price: number;
  quantity: number;
}

interface TableGridProps {
  accounts: Account[];
  onSelect: (id:  number) => void;
  onAdd: (name: string) => void;
  onRemove: (id: number) => void;
  onRename: (id: number, newLabel: string) => void;
  kitchenTickets: KitchenTicket[];
}

const TableGrid = ({
  accounts : tables,
  onSelect,
  onAdd,
  onRemove,
  onRename,
  kitchenTickets,
}: TableGridProps) => {
  const [editingId, setEditingId] = useState< number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);
  const [newName, setNewName] = useState("Cuenta mostrador");

  const startEdit = (e: React.MouseEvent,  account: Account) => {
    e.stopPropagation();
    setEditingId(account.id);
    setEditValue(account.name);
  };

  const confirmEdit = (id: number) => {
    const trimmed = editValue.trim();
    if (trimmed) onRename(id, trimmed);
    setEditingId(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background px-4 py-5 sm:px-6">
      <div className="mb-6 rounded-[28px] border border-border/80 bg-pos-surface/95 p-5 shadow-[0_18px_40px_-32px_rgba(98,68,38,0.45)] sm:p-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Delimuu POS
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecciona o crea una cuenta para empezar el servicio
        </p>
      </div>

      <div className="grid flex-1 content-start gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {tables.map((table) => {
          const total = table?.accountItems?.reduce(
            (s, i) => s + i.price * i.quantity,
            0,
          );
          const hasItems = table?.accountItems?.length > 0;
          const isEditing = editingId === table.id;
          const accountTickets = kitchenTickets.filter((ticket) => ticket.accountId === table.id && ticket.status !== "DELIVERED");
          const hasReadyTicket = accountTickets.some((ticket) => ticket.status === "READY");
          const hasPreparingTicket = accountTickets.some((ticket) => ticket.status === "PREPARING");

          return (
            <button
              key={table.id}
              onClick={() => !isEditing && onSelect(table.id)}
              className={`group relative flex min-h-44 flex-col items-center justify-center rounded-[24px] border-2 p-5 text-center transition-all hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] ${
                hasItems
                  ? "border-primary/40 bg-pos-order-bg text-pos-order-fg hover:border-primary/60"
                  : "border-white/10 bg-pos-order-bg/95 text-pos-order-fg hover:border-primary/30"
              }`}
            >
              {accountTickets.length > 0 && (
                <span className={`absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-black shadow-md ${hasReadyTicket ? "bg-success text-success-foreground animate-pulse" : hasPreparingTicket ? "bg-warning text-warning-foreground" : "bg-secondary text-foreground"}`}>
                  <ChefHat className="h-3.5 w-3.5" />
                  {hasReadyTicket ? "¡Listo para recoger!" : hasPreparingTicket ? "En preparación" : "En espera"}
                </span>
              )}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {!isEditing && (
                  <span
                    role="button"
                    onClick={(e) => startEdit(e, table)}
                    className="p-1.5 rounded-full text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                )}
                {tables.length >= 1 && (
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(table.id);
                    }}
                    className="p-1.5 rounded-full text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div
                className={`mb-3 flex h-14 w-14 items-center justify-center rounded-xl ${
                  hasItems
                    ? "bg-primary/20 text-primary"
                    : "bg-white/10 text-pos-order-fg/80"
                }`}
              >
                <ShoppingBag className="h-6 w-6" />
              </div>

              {isEditing ? (
                <div
                  className="flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmEdit(table.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="w-24 rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-center text-sm font-bold text-white outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span
                    role="button"
                    onClick={() => confirmEdit(table.id)}
                    className="p-1 rounded-full text-primary hover:bg-primary/10"
                  >
                    <Check className="h-4 w-4" />
                  </span>
                </div>
              ) : (
                <span className="text-sm font-bold tracking-wide text-white drop-shadow-sm">
                  {table.name}
                </span>
              )}

              {hasItems ? (
                <>
                  <span className="mt-1 text-xs text-white/70">
                    {table.accountItems.length}{" "}
                    {table.accountItems.length === 1 ? "producto" : "productos"}
                  </span>
                  <span className="text-sm font-bold text-primary mt-1.5">
                    {numeral(total).format("$ 0,0")}
                  </span>
                </>
              ) : (
                <span className="mt-1 text-xs text-white/70">
                  Sin productos
                </span>
              )}
            </button>
          );
        })}

        {/* Add table button */}
        {showNameInput ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-[24px] border-2 border-primary/30 bg-primary/5 p-5 shadow-sm">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) {
                  onAdd(newName.trim());
                  setNewName("");
                  setShowNameInput(false);
                }
                if (e.key === "Escape") {
                  setNewName("");
                  setShowNameInput(false);
                }
              }}
              placeholder="Nombre de cuenta..."
              className="w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground text-center placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (newName.trim()) {
                    onAdd(newName.trim());
                    setNewName("");
                    setShowNameInput(false);
                  }
                }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110"
              >
                Crear
              </button>
              <button
                onClick={() => {
                  setNewName("");
                  setShowNameInput(false);
                }}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary/80"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNameInput(true)}
            className="flex min-h-44 flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-border p-5 text-muted-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary mb-3">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold">Nueva cuenta</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TableGrid;
