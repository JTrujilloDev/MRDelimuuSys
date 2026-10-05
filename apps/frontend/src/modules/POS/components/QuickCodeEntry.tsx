import { Keyboard, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { normalizePosCode, parseQuickQuantity } from "../../../shared/utils/posCode";

export default function QuickCodeEntry({ disabled = false, onAdd }: {
  disabled?: boolean;
  onAdd: (code: string, quantity: number) => Promise<{ label: string }>;
}) {
  const codeRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const focusCode = (event: KeyboardEvent) => {
      if (event.key !== "F2" || disabled) return;
      event.preventDefault();
      codeRef.current?.focus();
      codeRef.current?.select();
    };
    window.addEventListener("keydown", focusCode);
    return () => window.removeEventListener("keydown", focusCode);
  }, [disabled]);

  const submit = useCallback(async (requestedQuantity: number) => {
    const normalizedCode = normalizePosCode(code);
    if (!normalizedCode || busy || disabled) {
      if (!normalizedCode) {
        setMessage({ kind: "error", text: "Ingresa un código de producto." });
        codeRef.current?.focus();
      }
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const result = await onAdd(normalizedCode, requestedQuantity);
      setCode("");
      setQuantity("1");
      setMessage({
        kind: "success",
        text: `${requestedQuantity} × ${result.label} agregado${requestedQuantity === 1 ? "" : "s"}.`,
      });
      window.requestAnimationFrame(() => codeRef.current?.focus());
    } catch (error) {
      const text = error instanceof Error ? error.message : "No fue posible agregar el producto.";
      setMessage({ kind: "error", text });
      window.requestAnimationFrame(() => {
        codeRef.current?.focus();
        codeRef.current?.select();
      });
    } finally {
      setBusy(false);
    }
  }, [busy, code, disabled, onAdd]);

  const pending = busy || disabled;
  return (
    <section className="mb-4 rounded-[22px] border border-primary/25 bg-primary/5 p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:flex">
            <Keyboard className="h-5 w-5" />
          </span>
          <label className="min-w-0 flex-1">
            <span className="mb-1 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-foreground">
              Código de producto
              <kbd className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">F2</kbd>
            </span>
            <input
              ref={codeRef}
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-base font-black uppercase text-foreground outline-none placeholder:font-medium placeholder:normal-case placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={code}
              disabled={pending}
              autoComplete="off"
              maxLength={20}
              placeholder="Escribe el código y pulsa Enter"
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setMessage(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit(1);
                }
              }}
            />
          </label>
        </div>
        <label className="w-full lg:w-32">
          <span className="mb-1 block text-xs font-black uppercase tracking-wide text-foreground">Cantidad</span>
          <input
            ref={quantityRef}
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-center text-base font-black text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={quantity}
            disabled={pending}
            inputMode="numeric"
            aria-label="Cantidad para el código"
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              setQuantity(event.target.value);
              setMessage(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const parsed = parseQuickQuantity(quantity);
              if (parsed === null) {
                setMessage({ kind: "error", text: "La cantidad debe ser un número entero mayor que cero." });
                quantityRef.current?.focus();
                quantityRef.current?.select();
                return;
              }
              void submit(parsed);
            }}
          />
        </label>
        <button
          type="button"
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            const parsed = parseQuickQuantity(quantity);
            if (parsed === null) {
              setMessage({ kind: "error", text: "La cantidad debe ser un número entero mayor que cero." });
              return;
            }
            void submit(parsed);
          }}
        >
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Agregar
        </button>
      </div>
      <p className={`mt-2 min-h-5 text-xs font-semibold ${message?.kind === "error" ? "text-danger" : "text-success"}`} aria-live="polite">
        {message?.text ?? "Enter agrega una unidad · Tab pasa a cantidad · Enter confirma la cantidad."}
      </p>
    </section>
  );
}
