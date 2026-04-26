import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useNavigate } from "react-router";

const Login = () => {
  const navigate = useNavigate();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });
    alert(`Form submitted with: ${JSON.stringify(data, null, 2)}`);
    navigate("/app/POS");
  };
  return (
    <div className="flex w-96 flex-col">
      <h1 className="text-2xl font-bold mb-5">Delimuu Sys</h1>
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
        <Button type="submit" variant="primary" className="w-full">
          Iniciar sesión
        </Button>
      </Form>
    </div>
  );
};

export default Login;
