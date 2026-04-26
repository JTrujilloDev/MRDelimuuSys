import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router";

export function AuthLayout() { 
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/app/POS");
  }, []);
  return (
    <div className="w-full h-screen flex items-center justify-center ">
      <Outlet />
    </div>
  );
}
