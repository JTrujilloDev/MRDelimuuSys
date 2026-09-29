import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Building2, CircleUserRound, Monitor, Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../../../app/auth/AuthProvider";
import type { UserRole } from "../../../app/auth/auth.service";
import type {
  AdminStore,
  AdminUser,
} from "../admin.service";
import {
  createTerminal,
  createUser,
  getStoreGroups,
  getUsers,
  updateStore,
  updateTerminal,
  updateUser,
} from "../admin.service";

const inputClass = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40";
const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "CASHIER", label: "Cajera" },
  { value: "KITCHEN", label: "Cocina" },
  { value: "ADMIN", label: "Administrador del punto" },
];

const errorMessage = (error: unknown) =>
  axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message ?? "No fue posible guardar los cambios"
    : "No fue posible guardar los cambios";

export default function AdminPage() {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [section, setSection] = useState<"users" | "stores">("users");
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
          <h1 className="text-3xl font-black">Usuarios, puntos y terminales</h1>
        </div>
        <div className="mb-6 flex gap-2">
          <button className={`${buttonClass} ${section !== "users" ? "bg-secondary text-foreground" : ""}`} onClick={() => setSection("users")}>
            <CircleUserRound className="h-4 w-4" /> Usuarios
          </button>
          <button className={`${buttonClass} ${section !== "stores" ? "bg-secondary text-foreground" : ""}`} onClick={() => setSection("stores")}>
            <Building2 className="h-4 w-4" /> Puntos y cajas
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
        ) : (
          <StoresSection groups={groupsQuery.data ?? []} isLoading={groupsQuery.isLoading} onChanged={refresh} />
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
  const [error, setError] = useState("");
  const [accesses, setAccesses] = useState<Record<number, UserRole | "">>({});
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const createMutation = useMutation({ mutationFn: createUser, onSuccess: onChanged });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateUser>[1] }) => updateUser(id, payload),
    onSuccess: onChanged,
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await createMutation.mutateAsync({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
        isGlobalAdmin,
        accesses: Object.entries(accesses)
          .filter((entry): entry is [string, UserRole] => Boolean(entry[1]))
          .map(([storeId, role]) => ({ storeId: Number(storeId), role })),
      });
      event.currentTarget.reset();
      setAccesses({});
      setIsGlobalAdmin(false);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-border bg-pos-surface p-5">
        <h2 className="text-lg font-black">Crear usuario</h2>
        <input className={inputClass} name="name" placeholder="Nombre completo" required />
        <input className={inputClass} name="email" type="email" placeholder="Correo" required />
        <input className={inputClass} name="password" type="password" minLength={10} placeholder="Contraseña de mínimo 10 caracteres" required />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={isGlobalAdmin} onChange={(event) => setIsGlobalAdmin(event.target.checked)} />
          Administrador general
        </label>
        {!isGlobalAdmin && stores.map((store) => (
          <label key={store.id} className="block text-sm">
            <span className="mb-1 block font-bold">{store.name}</span>
            <select className={inputClass} value={accesses[store.id] ?? ""} onChange={(event) => setAccesses((current) => ({ ...current, [store.id]: event.target.value as UserRole | "" }))}>
              <option value="">Sin acceso</option>
              {roleOptions
                .filter((option) => option.value !== "KITCHEN" || store.kitchenMode === "TICKETS")
                .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        ))}
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className={buttonClass} disabled={createMutation.isPending}><Plus className="h-4 w-4" /> Crear usuario</button>
      </form>

      <section className="space-y-3">
        {isLoading ? <p>Cargando usuarios…</p> : users.map((user) => (
          <article key={user.id} className="rounded-2xl border border-border bg-pos-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{user.name}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {user.isGlobalAdmin
                    ? "Administrador general"
                    : user.storeAccesses.map((access) => `${access.store.name}: ${access.role}`).join(" · ") || "Sin puntos asignados"}
                </p>
              </div>
              <button
                className={`${buttonClass} ${user.isActive ? "bg-destructive text-white" : "bg-success text-white"}`}
                disabled={user.id === currentUserId || updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: user.id, payload: { isActive: !user.isActive } })}
              >
                {user.isActive ? "Desactivar" : "Activar"}
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function StoresSection({ groups, isLoading, onChanged }: {
  groups: Awaited<ReturnType<typeof getStoreGroups>>;
  isLoading: boolean;
  onChanged: () => Promise<unknown>;
}) {
  const [error, setError] = useState("");
  const storeMutation = useMutation({ mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateStore(id, { isActive }), onSuccess: onChanged });
  const terminalMutation = useMutation({ mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => updateTerminal(id, { isActive }), onSuccess: onChanged });
  const createTerminalMutation = useMutation({ mutationFn: createTerminal, onSuccess: onChanged });

  const addTerminal = async (event: FormEvent<HTMLFormElement>, storeId: number) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await createTerminalMutation.mutateAsync({ storeId, code: String(form.get("code") ?? ""), name: String(form.get("name") ?? "") });
      event.currentTarget.reset();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  if (isLoading) return <p>Cargando puntos…</p>;
  return (
    <div className="space-y-7">
      {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-danger">{error}</p>}
      {groups.map((group) => (
        <section key={group.id}>
          <h2 className="mb-3 text-xl font-black">{group.name}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {group.stores.map((store) => (
              <article key={store.id} className="rounded-2xl border border-border bg-pos-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black">{store.name}</h3>
                    <p className="text-xs text-muted-foreground">{store.code} · Cocina {store.kitchenMode === "TICKETS" ? "habilitada" : "deshabilitada"}</p>
                  </div>
                  <button className={`${buttonClass} ${store.isActive ? "bg-destructive text-white" : "bg-success text-white"}`} onClick={() => storeMutation.mutate({ id: store.id, isActive: !store.isActive })}>
                    {store.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
                <div className="mt-5 space-y-2">
                  {store.terminals.map((terminal) => (
                    <div key={terminal.id} className="flex items-center justify-between rounded-xl bg-secondary/50 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm font-bold"><Monitor className="h-4 w-4" /> {terminal.name}</span>
                      <button className="text-xs font-bold text-primary" onClick={() => terminalMutation.mutate({ id: terminal.id, isActive: !terminal.isActive })}>
                        {terminal.isActive ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  ))}
                </div>
                <form className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2" onSubmit={(event) => void addTerminal(event, store.id)}>
                  <input className={inputClass} name="code" placeholder="Código" required />
                  <input className={inputClass} name="name" placeholder="Nombre" required />
                  <button className={buttonClass} title="Crear terminal"><Save className="h-4 w-4" /></button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

