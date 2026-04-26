import { useEffect } from "react";
import Sidebar from "./components/Sidebar";
import { Outlet } from "react-router";
import { connectQZ } from "../shared/services/qz.service";

export function MainLayout() {
   useEffect(() => {
    connectQZ();
  }, []);
  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
