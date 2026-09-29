import { useEffect } from "react";
import Sidebar from "./components/Sidebar";
import { Navigate, Outlet } from "react-router";
import { connectQZ } from "../shared/services/qz.service";
import { useAuth } from "../app/auth/AuthProvider";

export function MainLayout() {
  const { state, isLoading } = useAuth();

  useEffect(() => {
    if (!state?.activeContext) return;
    const initialize = async () => {
      try {
        await connectQZ();
      } catch (err) {
        console.error(err);
      }
    };

    initialize();
  }, [state?.activeContext]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Cargando sesión…</div>;
  }
  if (!state) return <Navigate to="/login" replace />;
  if (!state.activeContext) return <Navigate to="/select-context" replace />;

  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
