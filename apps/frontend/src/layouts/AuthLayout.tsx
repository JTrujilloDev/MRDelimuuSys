import { Outlet } from "react-router";

export function AuthLayout() { 
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <Outlet />
    </div>
  );
}
