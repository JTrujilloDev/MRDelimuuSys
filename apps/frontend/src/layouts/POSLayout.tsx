import { Outlet } from "react-router";
import Sidebar from "./components/Sidebar";

export function POSLayout() {
 
  return (
    <div className="flex h-screen w-full flex-row overflow-hidden">
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
