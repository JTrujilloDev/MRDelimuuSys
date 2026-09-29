import { Button, ListBox, Select } from "@heroui/react";
import { Building2, Monitor } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "../app/auth/AuthProvider";

const destinationForRole = (role: string, kitchenMode: string) =>
  role === "KITCHEN" && kitchenMode === "TICKETS" ? "/app/kitchen" : "/app/POS";

export default function ContextSelector() {
  const { state, isLoading, selectContext, logout } = useAuth();
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<number | null>(null);
  const [terminalId, setTerminalId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStore = useMemo(
    () => state?.stores.find((store) => store.id === storeId) ?? null,
    [state?.stores, storeId],
  );

  if (isLoading) return <p>Cargando sesión…</p>;
  if (!state) return <Navigate to="/login" replace />;
  if (state.activeContext) {
    return (
      <Navigate
        to={destinationForRole(state.activeContext.role, state.activeContext.store.kitchenMode)}
        replace
      />
    );
  }

  const handleContinue = async () => {
    if (!storeId || !terminalId) return;
    setError("");
    setIsSubmitting(true);
    try {
      const nextState = await selectContext(storeId, terminalId);
      const context = nextState.activeContext!;
      navigate(destinationForRole(context.role, context.store.kitchenMode), { replace: true });
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? "No se pudo seleccionar el punto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-3xl border border-border bg-pos-surface p-8 shadow-xl">
      <div>
        <p className="text-sm text-muted-foreground">Hola, {state.user.name}</p>
        <h1 className="mt-1 text-2xl font-black">Selecciona dónde trabajarás</h1>
      </div>

      <Select
        aria-label="Punto de venta"
        placeholder="Selecciona un punto"
        selectedKey={storeId ? String(storeId) : null}
        onSelectionChange={(key) => {
          setStoreId(Number(key) || null);
          setTerminalId(null);
        }}
      >
        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
        <Select.Popover>
          <ListBox>
            {state.stores.map((store) => (
              <ListBox.Item key={store.id} id={String(store.id)} textValue={store.name}>
                <Building2 className="h-4 w-4" /> {store.name}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      <Select
        aria-label="Terminal"
        placeholder="Selecciona una caja"
        isDisabled={!selectedStore}
        selectedKey={terminalId ? String(terminalId) : null}
        onSelectionChange={(key) => setTerminalId(Number(key) || null)}
      >
        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
        <Select.Popover>
          <ListBox>
            {(selectedStore?.terminals ?? []).map((terminal) => (
              <ListBox.Item key={terminal.id} id={String(terminal.id)} textValue={terminal.name}>
                <Monitor className="h-4 w-4" /> {terminal.name}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button
        variant="primary"
        isDisabled={!storeId || !terminalId || isSubmitting}
        onPress={handleContinue}
      >
        {isSubmitting ? "Ingresando…" : "Continuar"}
      </Button>
      <Button
        variant="ghost"
        onPress={() => void logout().then(() => navigate("/login", { replace: true }))}
      >
        Cerrar sesión
      </Button>
    </div>
  );
}

