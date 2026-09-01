import { AlertTriangle, Plus, Trash2, ShoppingBag, Pencil, Check, ChefHat } from "lucide-react";
import numeral from "numeral";
import { useState } from "react";
import { Button, Modal } from "@heroui/react";
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
  const [newName, setNewName] = useState("");
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const getNextAccountName = () => {
    const highestAccountNumber = tables.reduce((highest, account) => {
      const match = account.name.trim().match(/^Cuenta\s+(\d+)$/i);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    return `Cuenta ${highestAccountNumber + 1}`;
  };
  const activeTicketsForAccountToDelete = accountToDelete
    ? kitchenTickets.filter(
        (ticket) =>
          ticket.accountId === accountToDelete.id &&
          ticket.status !== "DELIVERED",
      ).length
    : 0;

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
        <p className="mt-2 text-base font-medium text-foreground/75">
          Selecciona o crea una cuenta para empezar el servicio
        </p>
      </div>

      <div className="grid flex-1 content-start grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
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
              aria-label={`Abrir cuenta ${table.name}, ${hasItems ? `${table.accountItems.length} productos, total ${numeral(total).format("$ 0,0")}` : "sin productos"}`}
              className={`group relative flex min-h-52 flex-col items-center justify-center rounded-[24px] border-2 p-6 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 active:scale-[0.98] ${
                hasItems
                  ? "border-primary/40 bg-pos-order-bg text-pos-order-fg hover:border-primary/60"
                  : "border-white/10 bg-pos-order-bg/95 text-pos-order-fg hover:border-primary/30"
              }`}
            >
              {accountTickets.length > 0 && (
                <span className={`absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-black shadow-md ${hasReadyTicket ? "border-success bg-success text-success-foreground animate-pulse" : hasPreparingTicket ? "border-warning bg-warning text-warning-foreground" : "border-border bg-secondary text-foreground"}`}>
                  <ChefHat className="h-4 w-4" />
                  {hasReadyTicket ? "¡Listo para recoger!" : hasPreparingTicket ? "En preparación" : "En espera"}
                </span>
              )}
              <div className="absolute right-2 top-2 flex gap-1 transition-all">
                {!isEditing && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => startEdit(e, table)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingId(table.id);
                        setEditValue(table.name);
                      }
                    }}
                    aria-label={`Editar nombre de ${table.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-black/30 text-white shadow-sm transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Pencil className="h-5 w-5" />
                  </span>
                )}
                {tables.length >= 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountToDelete(table);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setAccountToDelete(table);
                      }
                    }}
                    aria-label={`Eliminar cuenta ${table.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-black/30 text-white shadow-sm transition hover:border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-5 w-5" />
                  </span>
                )}
              </div>

              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border ${
                  hasItems
                    ? "border-primary/50 bg-primary/25 text-primary"
                    : "border-white/25 bg-white/10 text-white"
                }`}
              >
                <ShoppingBag className="h-8 w-8" />
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
                    className="h-11 w-36 rounded-xl border-2 border-white/50 bg-black/30 px-3 text-center text-base font-black text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/50"
                  />
                  <span
                    role="button"
                    onClick={() => confirmEdit(table.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                  >
                    <Check className="h-5 w-5" />
                  </span>
                </div>
              ) : (
                <span className="max-w-full text-lg font-black leading-tight tracking-wide text-white drop-shadow-sm sm:text-xl">
                  {table.name}
                </span>
              )}

              {hasItems ? (
                <>
                  <span className="mt-2 text-base font-semibold text-white/90">
                    {table.accountItems.length}{" "}
                    {table.accountItems.length === 1 ? "producto" : "productos"}
                  </span>
                  <span className="mt-2 text-xl font-black text-primary">
                    {numeral(total).format("$ 0,0")}
                  </span>
                </>
              ) : (
                <span className="mt-2 text-base font-semibold text-white/85">
                  Sin productos
                </span>
              )}
            </button>
          );
        })}

        {/* Add table button */}
        {showNameInput ? (
          <div className="flex min-h-52 flex-col items-center justify-center rounded-[24px] border-2 border-primary/50 bg-primary/10 p-6 shadow-sm">
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
              className="mb-4 h-12 w-full rounded-xl border-2 border-border bg-background px-3 text-center text-base font-bold text-foreground placeholder:text-foreground/55 outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
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
                className="min-h-11 rounded-xl bg-primary px-4 text-base font-black text-primary-foreground hover:brightness-110"
              >
                Crear
              </button>
              <button
                onClick={() => {
                  setNewName("");
                  setShowNameInput(false);
                }}
                className="min-h-11 rounded-xl border border-border bg-secondary px-4 text-base font-bold text-foreground hover:bg-secondary/80"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setNewName(getNextAccountName());
              setShowNameInput(true);
            }}
            className="flex min-h-52 flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-foreground/35 bg-pos-surface p-6 text-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-[0.98]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary mb-3">
              <Plus className="h-6 w-6" />
            </div>
            <span className="text-lg font-black">Nueva cuenta</span>
          </button>
        )}
      </div>

      <Modal>
        <Modal.Backdrop
          isOpen={Boolean(accountToDelete)}
          className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
        >
          <Modal.Container
            placement="center"
            size="sm"
            className="flex min-h-dvh items-center justify-center p-4"
          >
            <Modal.Dialog className="m-auto w-full max-w-md overflow-hidden rounded-[28px] border border-border bg-pos-surface shadow-2xl">
              <Modal.Header className="border-b border-border bg-danger/5 px-6 py-5">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danger/15 text-danger">
                    <AlertTriangle className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <Modal.Heading className="text-xl font-black text-foreground">
                      ¿Eliminar esta cuenta?
                    </Modal.Heading>
                    <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
                      {accountToDelete?.name}
                    </p>
                  </div>
                </div>
              </Modal.Header>
              <Modal.Body className="space-y-4 px-6 py-5">
                <p className="text-sm leading-6 text-muted-foreground">
                  Se eliminarán todos los productos abiertos de esta cuenta. Esta acción es permanente y no se puede deshacer.
                </p>
                {(accountToDelete?.accountItems.length ?? 0) > 0 && (
                  <div className="flex items-center justify-between rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">Productos abiertos</span>
                    <span className="rounded-full bg-warning/20 px-3 py-1 text-sm font-black text-warning">
                      {accountToDelete?.accountItems.length}
                    </span>
                  </div>
                )}
                {activeTicketsForAccountToDelete > 0 && (
                  <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
                    <p className="font-black text-danger">Eliminación bloqueada</p>
                    <p className="mt-1 text-sm leading-5 text-foreground/70">
                      Tiene {activeTicketsForAccountToDelete} comanda(s) activa(s). Primero deben completarse y marcarse como recogidas.
                    </p>
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer className="flex-col-reverse gap-2 border-t border-border bg-secondary/20 px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  variant="ghost"
                  className="w-full sm:w-auto"
                  onPress={() => setAccountToDelete(null)}
                >
                  Conservar cuenta
                </Button>
                {activeTicketsForAccountToDelete === 0 && (
                  <Button
                    className="w-full bg-danger font-bold text-danger-foreground sm:w-auto"
                    onPress={() => {
                      if (accountToDelete) onRemove(accountToDelete.id);
                      setAccountToDelete(null);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar definitivamente
                  </Button>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};

export default TableGrid;
