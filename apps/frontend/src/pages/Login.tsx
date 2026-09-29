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
    <div className="flex w-96 flex-col">
      <h1 className="text-2xl font-bold mb-1">Delimuu Sys</h1>
      <p className="mb-5 text-sm text-muted-foreground">Ingresa con tu usuario de trabajo</p>
      <Form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <TextField
          isRequired
          name="email"
          type="email"
          validate={(value) => {
            if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
              return "Please enter a valid email address";
            }
            return null;
          }}
        >
          <Label>Email</Label>
          <Input />
          <FieldError />
        </TextField>
        <TextField isRequired name="password" type="password">
          <Label>Contraseña</Label>
          <Input />
          <FieldError />
        </TextField>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" isDisabled={isSubmitting}>
          {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </Form>
    </div>
  );
};

export default Login;
