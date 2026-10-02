import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../app/auth/AuthProvider";
import axios from "axios";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { systemBrand } from "../app/branding/brand";

const Login = () => {
  const navigate = useNavigate();
  const { state, isLoading, login, selectContext } = useAuth();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isLoading || !state) return;
    navigate(
      state.activeContext
        ? state.activeContext.role === "KITCHEN"
          ? "/app/kitchen"
          : "/app/POS"
        : "/select-context",
      { replace: true },
    );
  }, [isLoading, navigate, state]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError("");
    setIsSubmitting(true);
    try {
      const nextState = await login(
        String(formData.get("email") ?? ""),
        String(formData.get("password") ?? ""),
      );
      const onlyStore = nextState.stores.length === 1 ? nextState.stores[0] : null;
      const onlyTerminal = onlyStore?.terminals.length === 1 ? onlyStore.terminals[0] : null;
      if (onlyStore && onlyTerminal) {
        const selected = await selectContext(onlyStore.id, onlyTerminal.id);
        navigate(
          selected.activeContext?.role === "KITCHEN" ? "/app/kitchen" : "/app/POS",
          { replace: true },
        );
      } else {
        navigate("/select-context", { replace: true });
      }
    } catch (requestError: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data?.message
        : undefined;
      setError(message ?? "No fue posible iniciar sesión");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <section aria-labelledby="login-heading" className="w-full max-w-[460px] overflow-hidden rounded-[28px] border border-border bg-pos-surface shadow-[0_24px_80px_-32px_rgba(49,24,17,0.35)]">
      <div className="border-b border-border bg-[#F4EBDD]">
        <img src={systemBrand.logo} alt="Delisys" width={2172} height={724} className="block h-auto w-full" fetchPriority="high" />
      </div>
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <h1 id="login-heading" className="text-2xl font-bold tracking-tight text-foreground">Bienvenido a Delisys</h1>
        <p className="mb-7 mt-2 text-sm leading-6 text-muted-foreground">Ingresa con tu usuario de trabajo.</p>
        <Form className="flex flex-col gap-5" onSubmit={onSubmit} aria-busy={isSubmitting}>
          <TextField
            isRequired
            name="email"
            type="email"
            validate={(value) => {
              if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
                return "Ingresa un correo electrónico válido";
              }
              return null;
            }}
          >
            <Label>Correo electrónico</Label>
            <Input autoComplete="username" placeholder="nombre@correo.com" />
            <FieldError />
          </TextField>
          <TextField isRequired name="password" type="password">
            <Label>Contraseña</Label>
            <Input autoComplete="current-password" placeholder="Tu contraseña" />
            <FieldError />
          </TextField>
          {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" className="mt-1 min-h-12 w-full gap-2 font-bold" isDisabled={isSubmitting}>
            {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
            {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </Form>
        <p className="mt-7 flex items-center justify-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
          Acceso para personal autorizado
        </p>
      </div>
    </section>
  );
};

export default Login;
