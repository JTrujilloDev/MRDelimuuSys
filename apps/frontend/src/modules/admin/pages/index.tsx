import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  Building2,
  ChefHat,
  CircleDollarSign,
  CircleUserRound,
  Monitor,
  Pencil,
  Plus,
  ShieldCheck,
  Store,
  Tags,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../../../app/auth/AuthProvider";
import type { UserRole } from "../../../app/auth/auth.service";
import type { AdminStore, AdminUser, GroupCatalogVariant } from "../admin.service";
import {
  createTerminal,
  createUser,
  getStoreGroups,
  getGroupCatalog,
  getUsers,
  updateStore,
  updateTerminal,
  updateGroupCatalogItem,
  updateUser,
} from "../admin.service";

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40";
const inactiveTabClass =
  "border border-border bg-pos-surface text-foreground shadow-sm hover:border-primary/50 hover:bg-secondary";
const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "CASHIER", label: "Cajera" },
  { value: "KITCHEN", label: "Cocina" },
  { value: "ADMIN", label: "Administrador del punto" },
];

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador del punto",
  CASHIER: "Cajera",
  KITCHEN: "Cocina",
  WAITER: "Mesero",
  BAKERY: "Panadería",
};

const errorMessage = (error: unknown) =>
  axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? "No fue posible guardar los cambios"
    : "No fue posible guardar los cambios";

export default function AdminPage() {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<"users" | "stores" | "catalog">("users");
  const groupsQuery = useQuery({ queryKey: ["admin", "store-groups"], queryFn: getStoreGroups });
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: getUsers });
  const stores = useMemo(
    () => groupsQuery.data?.flatMap((group) => group.stores) ?? [],
    [groupsQuery.data],
  );

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "store-groups"] }),
  ]);

  if (!state?.user.isGlobalAdmin) return <Navigate to="/app/POS" replace />;

  return (
    <main className="h-full overflow-y-auto bg-background p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Administración</p>
          <h1 className="text-3xl font-black">Usuarios, puntos y cajas</h1>
        </div>

        <div className="mb-6 grid max-w-3xl grid-cols-3 gap-2 rounded-2xl border border-border bg-secondary/60 p-2" role="tablist" aria-label="Secciones de administración">
          <button
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-black transition-all ${
              section === "users"
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-transparent bg-background text-foreground hover:border-primary/40"
            }`}
            onClick={() => setSection("users")}
            role="tab"
            aria-selected={section === "users"}
          >
            <CircleUserRound className="h-5 w-5" /> Usuarios
          </button>
          <button
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-black transition-all ${
              section === "stores"
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-transparent bg-background text-foreground hover:border-primary/40"
            }`}
            onClick={() => setSection("stores")}
            role="tab"
            aria-selected={section === "stores"}
          >
            <Building2 className="h-5 w-5" /> Puntos y cajas
          </button>
          <button
            className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-black transition-all ${
              section === "catalog"
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-transparent bg-background text-foreground hover:border-primary/40"
            }`}
            onClick={() => setSection("catalog")}
            role="tab"
            aria-selected={section === "catalog"}
          >
            <Tags className="h-5 w-5" /> Catálogos y precios
          </button>
        </div>

        {section === "users" ? (
          <UsersSection
            users={usersQuery.data ?? []}
            stores={stores}
            currentUserId={state.user.id}
            isLoading={usersQuery.isLoading || groupsQuery.isLoading}
            onChanged={refresh}
          />
        ) : section === "stores" ? (
          <StoresSection
            groups={groupsQuery.data ?? []}
            isLoading={groupsQuery.isLoading}
            onChanged={refresh}
          />
        ) : (
          <CatalogSection groups={groupsQuery.data ?? []} />
        )}
      </div>
    </main>
  );
}

function UsersSection({ users, stores, currentUserId, isLoading, onChanged }: {
  users: AdminUser[];
  stores: AdminStore[];
  currentUserId: number;
  isLoading: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [accesses, setAccesses] = useState<Record<number, UserRole | "">>({});
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [editAccesses, setEditAccesses] = useState<Record<number, UserRole | "">>({});
  const [editIsGlobalAdmin, setEditIsGlobalAdmin] = useState(false);
  const createMutation = useMutation({ mutationFn: createUser });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, payload),
  });

  const closeCreate = () => {
    setIsCreateOpen(false);
    setError("");
    setAccesses({});
    setIsGlobalAdmin(false);
  };

  const openEdit = (user: AdminUser) => {
    setError("");
    setNotice("");
    setEditingUser(user);
    setEditIsGlobalAdmin(user.isGlobalAdmin);
    setEditAccesses(Object.fromEntries(
      user.storeAccesses
        .filter((access) => access.isActive)
        .map((access) => [access.storeId, access.role]),
    ));
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditAccesses({});
    setEditIsGlobalAdmin(false);
    setError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setNotice("");
    try {
      await createMutation.mutateAsync({
        name: String(form.get("new-user-name") ?? ""),
        email: String(form.get("new-user-email") ?? ""),
        password: String(form.get("new-user-password") ?? ""),
        isGlobalAdmin,
        accesses: Object.entries(accesses)
          .filter((entry): entry is [string, UserRole] => Boolean(entry[1]))
          .map(([storeId, role]) => ({ storeId: Number(storeId), role })),
      });
      formElement.reset();
      await onChanged();
      closeCreate();
      setNotice("Usuario creado correctamente.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const toggleUser = async (user: AdminUser) => {
    setError("");
    setNotice("");
    try {
      await updateMutation.mutateAsync({ id: user.id, payload: { isActive: !user.isActive } });
      await onChanged();
      setNotice(`${user.name} fue ${user.isActive ? "desactivado" : "activado"}.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    try {
      await updateMutation.mutateAsync({
        id: editingUser.id,
        payload: {
          name: String(form.get("edit-user-name") ?? ""),
          email: String(form.get("edit-user-email") ?? ""),
          isGlobalAdmin: editIsGlobalAdmin,
          accesses: editIsGlobalAdmin
            ? []
            : Object.entries(editAccesses)
              .filter((entry): entry is [string, UserRole] => Boolean(entry[1]))
              .map(([storeId, role]) => ({ storeId: Number(storeId), role })),
        },
      });
      await onChanged();
      const userName = String(form.get("edit-user-name") ?? editingUser.name);
      closeEdit();
      setNotice(`${userName} fue actualizado correctamente.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Usuarios</h2>
          <p className="text-sm text-muted-foreground">Administra quién puede entrar y a qué puntos tiene acceso.</p>
        </div>
        <button className={buttonClass} onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Crear usuario
        </button>
      </div>

      {notice && <p className="mb-4 rounded-xl bg-success/10 p-3 text-sm font-semibold text-success">{notice}</p>}
      {error && !isCreateOpen && !editingUser && <p className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}

      <div className="space-y-3">
        {isLoading ? <p>Cargando usuarios…</p> : users.map((user) => (
          <article key={user.id} className="rounded-2xl border border-border bg-pos-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{user.name}</h3>
                  <StatusPill isActive={user.isActive} />
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.isGlobalAdmin ? (
                    <RoleTag role="ADMIN" label="Administrador general" />
                  ) : user.storeAccesses.length ? user.storeAccesses.map((access) => (
                    <div key={access.storeId} className="flex items-center gap-1.5 rounded-xl border border-border bg-background p-1.5 pr-2.5">
                      <span className="text-xs font-bold text-muted-foreground">{access.store.name}</span>
                      <RoleTag role={access.role} />
                    </div>
                  )) : <span className="text-xs text-muted-foreground">Sin puntos asignados</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={`${buttonClass} ${inactiveTabClass}`} onClick={() => openEdit(user)}>
                  <Pencil className="h-4 w-4" /> Editar
                </button>
                <button
                  className={`${buttonClass} ${user.isActive ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90"}`}
                  disabled={user.id === currentUserId || updateMutation.isPending}
                  onClick={() => void toggleUser(user)}
                  title={user.id === currentUserId ? "No puedes desactivar tu propio usuario" : undefined}
                >
                  {user.isActive ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {isCreateOpen && (
        <Modal title="Crear usuario" description="Define sus credenciales y los puntos a los que podrá acceder." onClose={closeCreate}>
          <form onSubmit={submit} autoComplete="off" className="space-y-4">
            <input
              className={inputClass}
              name="new-user-name"
              placeholder="Nombre completo"
              autoComplete="off"
              required
            />
            <input
              className={inputClass}
              name="new-user-email"
              type="email"
              placeholder="Correo"
              autoComplete="off"
              data-lpignore="true"
              required
            />
            <input
              className={inputClass}
              name="new-user-password"
              type="password"
              minLength={10}
              placeholder="Contraseña de mínimo 10 caracteres"
              autoComplete="new-password"
              data-lpignore="true"
              required
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={isGlobalAdmin}
                onChange={(event) => setIsGlobalAdmin(event.target.checked)}
              />
              Administrador general
            </label>
            {!isGlobalAdmin && stores.filter((storeItem) => storeItem.isActive).map((storeItem) => (
              <label key={storeItem.id} className="block text-sm">
                <span className="mb-1 block font-bold">{storeItem.name}</span>
                <select
                  className={inputClass}
                  value={accesses[storeItem.id] ?? ""}
                  onChange={(event) => setAccesses((current) => ({
                    ...current,
                    [storeItem.id]: event.target.value as UserRole | "",
                  }))}
                >
                  <option value="">Sin acceso</option>
                  {roleOptions
                    .filter((option) => option.value !== "KITCHEN" || storeItem.kitchenMode === "TICKETS")
                    .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ))}
            {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={`${buttonClass} ${inactiveTabClass}`} onClick={closeCreate}>Cancelar</button>
              <button className={buttonClass} disabled={createMutation.isPending}>
                <Plus className="h-4 w-4" /> {createMutation.isPending ? "Creando…" : "Crear usuario"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editingUser && (
        <Modal
          title={`Editar a ${editingUser.name}`}
          description="Puedes cambiar sus datos de ingreso y los roles que cumple en cada punto."
          onClose={closeEdit}
        >
          <form onSubmit={submitEdit} autoComplete="off" className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-bold">Nombre completo</span>
              <input className={inputClass} name="edit-user-name" defaultValue={editingUser.name} autoComplete="off" required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold">Correo de ingreso</span>
              <input className={inputClass} name="edit-user-email" type="email" defaultValue={editingUser.email} autoComplete="off" required />
              <span className="mt-1 block text-xs text-muted-foreground">Si lo cambias, deberá iniciar sesión con el nuevo correo.</span>
            </label>
            <label className="flex items-start gap-2 text-sm font-semibold">
              <input
                className="mt-1"
                type="checkbox"
                checked={editIsGlobalAdmin}
                disabled={editingUser.id === currentUserId && editingUser.isGlobalAdmin}
                onChange={(event) => setEditIsGlobalAdmin(event.target.checked)}
              />
              <span>
                Administrador general
                {editingUser.id === currentUserId && editingUser.isGlobalAdmin && (
                  <span className="block text-xs font-normal text-muted-foreground">No puedes retirar tu propio acceso administrativo.</span>
                )}
              </span>
            </label>
            {!editIsGlobalAdmin && stores.filter((storeItem) => storeItem.isActive).map((storeItem) => (
              <label key={storeItem.id} className="block text-sm">
                <span className="mb-1 block font-bold">{storeItem.name}</span>
                <select
                  className={inputClass}
                  value={editAccesses[storeItem.id] ?? ""}
                  onChange={(event) => setEditAccesses((current) => ({
                    ...current,
                    [storeItem.id]: event.target.value as UserRole | "",
                  }))}
                >
                  <option value="">Sin acceso</option>
                  {roleOptions
                    .filter((option) => option.value !== "KITCHEN" || storeItem.kitchenMode === "TICKETS")
                    .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ))}
            <p className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
              La contraseña no se muestra ni se cambia aquí. Tendrá un flujo independiente de restablecimiento.
            </p>
            {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={`${buttonClass} ${inactiveTabClass}`} onClick={closeEdit}>Cancelar</button>
              <button className={buttonClass} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function StoresSection({ groups, isLoading, onChanged }: {
  groups: Awaited<ReturnType<typeof getStoreGroups>>;
  isLoading: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const { state: authState, refresh: refreshAuth } = useAuth();
  const navigate = useNavigate();
  const stores = useMemo(
    () => groups.flatMap((group) => group.stores.map((storeItem) => ({ ...storeItem, groupName: group.name }))),
    [groups],
  );
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [isCreateTerminalOpen, setIsCreateTerminalOpen] = useState(false);
  const [isEditStoreOpen, setIsEditStoreOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedStore = stores.find((storeItem) => storeItem.id === selectedStoreId) ?? stores[0] ?? null;
  const storeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateStore(id, { isActive }),
  });
  const editStoreMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateStore>[1] }) =>
      updateStore(id, payload),
  });
  const terminalMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateTerminal(id, { isActive }),
  });
  const createTerminalMutation = useMutation({ mutationFn: createTerminal });

  const toggleStore = async () => {
    if (!selectedStore) return;
    if (selectedStore.isActive && !window.confirm(`¿Desactivar ${selectedStore.name} y todas sus cajas?`)) return;
    const removesCurrentContext = Boolean(
      selectedStore.isActive && authState?.activeContext?.store.id === selectedStore.id,
    );
    setError("");
    setNotice("");
    try {
      await storeMutation.mutateAsync({ id: selectedStore.id, isActive: !selectedStore.isActive });
      if (removesCurrentContext) {
        navigate("/select-context?change=1&reason=context-unavailable", { replace: true });
      }
      await Promise.all([onChanged(), refreshAuth()]);
      if (removesCurrentContext) return;
      setNotice(`${selectedStore.name} fue ${selectedStore.isActive ? "desactivado" : "activado"}.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const toggleTerminal = async (terminal: AdminStore["terminals"][number]) => {
    const removesCurrentContext = Boolean(
      terminal.isActive && authState?.activeContext?.terminal.id === terminal.id,
    );
    setError("");
    setNotice("");
    try {
      await terminalMutation.mutateAsync({ id: terminal.id, isActive: !terminal.isActive });
      if (removesCurrentContext) {
        navigate("/select-context?change=1&reason=context-unavailable", { replace: true });
      }
      await Promise.all([onChanged(), refreshAuth()]);
      if (removesCurrentContext) return;
      setNotice(`${terminal.name} fue ${terminal.isActive ? "desactivada" : "activada"}.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const addTerminal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStore) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setError("");
    setNotice("");
    try {
      await createTerminalMutation.mutateAsync({
        storeId: selectedStore.id,
        code: String(form.get("new-terminal-code") ?? "").trim().toUpperCase(),
        name: String(form.get("new-terminal-name") ?? "").trim(),
      });
      formElement.reset();
      await onChanged();
      setIsCreateTerminalOpen(false);
      setNotice("Caja creada correctamente.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const submitStoreEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStore) return;
    const form = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    try {
      await editStoreMutation.mutateAsync({
        id: selectedStore.id,
        payload: {
          name: String(form.get("edit-store-name") ?? "").trim(),
          kitchenMode: String(form.get("edit-store-kitchen-mode") ?? "NONE") as AdminStore["kitchenMode"],
        },
      });
      await Promise.all([onChanged(), refreshAuth()]);
      setIsEditStoreOpen(false);
      setNotice("Datos del punto actualizados correctamente.");
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  if (isLoading) return <p>Cargando puntos…</p>;
  if (!selectedStore) return <p>No hay puntos de venta configurados.</p>;

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-black">Puntos y cajas</h2>
        <p className="text-sm text-muted-foreground">Selecciona un punto para administrar únicamente sus cajas.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <nav className="h-fit space-y-2 rounded-2xl border border-border bg-pos-surface p-3 shadow-sm" aria-label="Puntos de venta">
          {stores.map((storeItem) => {
            const isSelected = storeItem.id === selectedStore.id;
            return (
              <button
                key={storeItem.id}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-secondary"
                }`}
                onClick={() => {
                  setSelectedStoreId(storeItem.id);
                  setError("");
                  setNotice("");
                }}
                aria-current={isSelected ? "page" : undefined}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-black"><Store className="h-4 w-4" /> {storeItem.name}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${storeItem.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                </span>
                <span className={`mt-1 block text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {storeItem.groupName} · {storeItem.terminals.length} caja{storeItem.terminals.length === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </nav>

        <article className="rounded-2xl border border-border bg-pos-surface p-5 shadow-sm lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-black">{selectedStore.name}</h3>
                <StatusPill isActive={selectedStore.isActive} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedStore.groupName} · Código {selectedStore.code}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <ChefHat className="h-4 w-4" />
                Cocina {selectedStore.kitchenMode === "TICKETS" ? "habilitada" : "deshabilitada"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`${buttonClass} ${inactiveTabClass}`}
                onClick={() => {
                  setError("");
                  setIsEditStoreOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" /> Editar datos
              </button>
              <button
                className={`${buttonClass} ${selectedStore.isActive ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90"}`}
                onClick={() => void toggleStore()}
                disabled={storeMutation.isPending}
              >
                {selectedStore.isActive ? "Desactivar punto" : "Activar punto"}
              </button>
            </div>
          </div>

          {notice && <p className="mt-4 rounded-xl bg-success/10 p-3 text-sm font-semibold text-success">{notice}</p>}
          {error && !isCreateTerminalOpen && !isEditStoreOpen && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="font-black">Cajas de este punto</h4>
              <p className="text-xs text-muted-foreground">Cada caja pertenece únicamente a este inventario.</p>
            </div>
            <button
              className={buttonClass}
              onClick={() => {
                setError("");
                setIsCreateTerminalOpen(true);
              }}
              disabled={!selectedStore.isActive}
              title={!selectedStore.isActive ? "Activa el punto antes de crear una caja" : undefined}
            >
              <Plus className="h-4 w-4" /> Nueva caja
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {selectedStore.terminals.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                Este punto todavía no tiene cajas.
              </p>
            ) : selectedStore.terminals.map((terminal) => (
              <div key={terminal.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <div>
                  <span className="flex items-center gap-2 text-sm font-black"><Monitor className="h-4 w-4" /> {terminal.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Código {terminal.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill isActive={terminal.isActive} />
                  <button
                    className="text-xs font-bold text-primary hover:underline disabled:opacity-40"
                    onClick={() => void toggleTerminal(terminal)}
                    disabled={terminalMutation.isPending || (!selectedStore.isActive && !terminal.isActive)}
                  >
                    {terminal.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {isCreateTerminalOpen && (
        <Modal
          title={`Nueva caja en ${selectedStore.name}`}
          description="La caja quedará asociada únicamente a este punto de venta."
          onClose={() => {
            setIsCreateTerminalOpen(false);
            setError("");
          }}
        >
          <form onSubmit={addTerminal} autoComplete="off" className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-bold">Código</span>
              <input className={inputClass} name="new-terminal-code" placeholder="Ej. VEL-CAJA-02" autoComplete="off" required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold">Nombre</span>
              <input className={inputClass} name="new-terminal-name" placeholder="Ej. Caja terraza" autoComplete="off" required />
            </label>
            {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={`${buttonClass} ${inactiveTabClass}`}
                onClick={() => {
                  setIsCreateTerminalOpen(false);
                  setError("");
                }}
              >
                Cancelar
              </button>
              <button className={buttonClass} disabled={createTerminalMutation.isPending}>
                <Plus className="h-4 w-4" /> {createTerminalMutation.isPending ? "Guardando…" : "Crear caja"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {isEditStoreOpen && (
        <Modal
          title={`Editar ${selectedStore.name}`}
          description="El código y el inventario asociado se conservan para mantener la trazabilidad."
          onClose={() => {
            setIsEditStoreOpen(false);
            setError("");
          }}
        >
          <form onSubmit={submitStoreEdit} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-bold">Nombre visible</span>
              <input className={inputClass} name="edit-store-name" defaultValue={selectedStore.name} required />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-bold">Conexión con cocina</span>
              <select className={inputClass} name="edit-store-kitchen-mode" defaultValue={selectedStore.kitchenMode}>
                <option value="NONE">Sin conexión con cocina</option>
                <option value="TICKETS">Enviar pedidos a cocina</option>
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">Esta opción debe permanecer deshabilitada para los puntos de Veleño.</span>
            </label>
            <div className="rounded-xl border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
              Código fijo del punto: <strong className="text-foreground">{selectedStore.code}</strong>
            </div>
            {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={`${buttonClass} ${inactiveTabClass}`}
                onClick={() => {
                  setIsEditStoreOpen(false);
                  setError("");
                }}
              >
                Cancelar
              </button>
              <button className={buttonClass} disabled={editStoreMutation.isPending}>
                {editStoreMutation.isPending ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}

function CatalogSection({ groups }: { groups: Awaited<ReturnType<typeof getStoreGroups>> }) {
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null;
  const catalogQuery = useQuery({
    queryKey: ["admin", "catalog", selectedGroup?.id],
    queryFn: () => getGroupCatalog(selectedGroup!.id),
    enabled: Boolean(selectedGroup),
  });
  const updateMutation = useMutation({
    mutationFn: ({ variantId, salePrice, isActive }: { variantId: number; salePrice: number; isActive: boolean }) =>
      updateGroupCatalogItem(selectedGroup!.id, variantId, { salePrice, isActive }),
  });
  const normalizedSearch = search.trim().toLowerCase();
  const saleableTypes = new Set(["FINISHED_PRODUCT", "RECIPE_PRODUCT", "THIRD_PARTY_PRODUCT"]);
  const products = (catalogQuery.data?.products ?? []).filter((product) =>
    saleableTypes.has(product.productType) &&
    (!normalizedSearch || `${product.name} ${product.category.name}`.toLowerCase().includes(normalizedSearch)),
  );

  const saveVariant = async (variant: GroupCatalogVariant, salePrice: number, isActive: boolean) => {
    setError("");
    setNotice("");
    try {
      await updateMutation.mutateAsync({ variantId: variant.id, salePrice, isActive });
      await queryClient.invalidateQueries({ queryKey: ["admin", "catalog", selectedGroup?.id] });
      setNotice(`${variant.name} fue actualizado en el catálogo ${selectedGroup?.name}.`);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  if (!selectedGroup) return <p>No hay grupos configurados.</p>;

  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-black">Catálogos y PVP</h2>
        <p className="text-sm text-muted-foreground">Los puntos de un mismo grupo comparten productos y precios, pero no inventario.</p>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-border bg-pos-surface p-4 shadow-sm md:grid-cols-[260px_1fr]">
        <label className="text-sm">
          <span className="mb-1 block font-bold">Grupo comercial</span>
          <select
            className={inputClass}
            value={selectedGroup.id}
            onChange={(event) => {
              setSelectedGroupId(Number(event.target.value));
              setError("");
              setNotice("");
            }}
          >
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-bold">Buscar producto</span>
          <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre o categoría" />
        </label>
      </div>

      {notice && <p className="mb-4 rounded-xl bg-success/10 p-3 text-sm font-semibold text-success">{notice}</p>}
      {error && <p className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}

      {catalogQuery.isLoading ? <p>Cargando catálogo…</p> : (
        <div className="space-y-4">
          {products.map((product) => (
            <article key={product.id} className="rounded-2xl border border-border bg-pos-surface p-5 shadow-sm">
              <div className="mb-3">
                <h3 className="font-black">{product.name}</h3>
                <p className="text-xs text-muted-foreground">{product.category.name}</p>
              </div>
              <div className="space-y-2">
                {product.variants.map((variant) => (
                  <CatalogVariantRow
                    key={`${selectedGroup.id}-${variant.id}-${variant.catalog?.salePrice}-${variant.catalog?.isActive}`}
                    variant={variant}
                    isPending={updateMutation.isPending}
                    onSave={(salePrice, isActive) => void saveVariant(variant, salePrice, isActive)}
                  />
                ))}
              </div>
            </article>
          ))}
          {products.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No hay productos que coincidan con la búsqueda.</p>
          )}
        </div>
      )}
    </section>
  );
}

function CatalogVariantRow({ variant, isPending, onSave }: {
  variant: GroupCatalogVariant;
  isPending: boolean;
  onSave: (salePrice: number, isActive: boolean) => void;
}) {
  const [salePrice, setSalePrice] = useState(String(variant.catalog?.salePrice ?? 0));
  const [isActive, setIsActive] = useState(variant.catalog?.isActive ?? false);
  const numericPrice = Number(salePrice);

  return (
    <div className="grid items-end gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-[1fr_180px_150px_auto]">
      <div>
        <p className="text-sm font-black">{variant.name}</p>
        <p className="text-xs text-muted-foreground">{variant.isActive ? "Variante activa" : "Variante desactivada en el catálogo maestro"}</p>
      </div>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-bold">PVP</span>
        <input
          className={inputClass}
          type="number"
          min="0"
          step="0.01"
          value={salePrice}
          onChange={(event) => setSalePrice(event.target.value)}
        />
      </label>
      <label className="flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold">
        <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} disabled={!variant.isActive} />
        En este catálogo
      </label>
      <button
        className={buttonClass}
        disabled={isPending || !variant.isActive || !Number.isFinite(numericPrice) || numericPrice < 0}
        onClick={() => onSave(numericPrice, isActive)}
      >
        Guardar
      </button>
    </div>
  );
}

function RoleTag({ role, label }: { role: UserRole; label?: string }) {
  const Icon = role === "ADMIN"
    ? ShieldCheck
    : role === "CASHIER"
      ? CircleDollarSign
      : role === "KITCHEN" || role === "BAKERY"
        ? ChefHat
        : CircleUserRound;
  const colorClass = role === "ADMIN"
    ? "border-primary/25 bg-primary/10 text-primary"
    : role === "CASHIER"
      ? "border-success/25 bg-success/10 text-success"
      : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" /> {label ?? roleLabels[role]}
    </span>
  );
}

function StatusPill({ isActive }: { isActive: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide ${
      isActive ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
    }`}>
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

function Modal({ title, description, onClose, children }: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" role="presentation" onMouseDown={onClose}>
      <section
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-pos-surface p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="admin-modal-title" className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={onClose} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
