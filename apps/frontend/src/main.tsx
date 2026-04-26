import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { RouterProvider } from "react-router";
import { router } from "./app/router/index.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@heroui/react";
import { AppProviders } from "./app/providers";

const queryClient = new QueryClient();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <ToastProvider placement="bottom end" />
        <RouterProvider router={router} />
      </AppProviders>
    </QueryClientProvider>
  </StrictMode>,
);
