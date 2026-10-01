import { createBrowserRouter, Navigate } from "react-router";
import { AuthLayout } from "../../layouts/AuthLayout";
import Login from "../../pages/Login";
import { MainLayout } from "../../layouts/MainLayout";
import POS from "../../pages/POS";
import Catalog from "../../modules/catalog/pages";
import Inventory from "../../modules/POSInventory/pages";
import FundationTags from "../../modules/fundationTags/pages";
import ClientView from "../../modules/clientView/pages";
import KitchenView from "../../modules/kitchenView/pages";
import CashRegisterHistory from "../../modules/cashRegisterHistory/pages";
import SecurityCameras from "../../modules/securityCameras/pages";
import ContextSelector from "../../pages/ContextSelector";
import AdminPage from "../../modules/admin/pages";
import ReportsPage from "../../modules/reports/pages";
import InventoryTransfersPage from "../../modules/inventoryTransfers/pages";
import { useAuth } from "../auth/AuthProvider";

const GlobalAdminOnly = ({ children }: { children: React.ReactNode }) => {
  const { state } = useAuth();

  return state?.user.isGlobalAdmin ? children : <Navigate to="/app/pos" replace />;
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Navigate to="login" replace /> },
      { path: "login", element: <Login /> },
      { path: "select-context", element: <ContextSelector /> },
    ],
  },
  {
    path: "/app",
    element: <MainLayout />,
    children: [
      { path: "POS", element: <POS /> },
      { path: "money-movements", element: <h1>Movimientos de Dinero</h1> },
      { path: "catalog", element: <Catalog /> },
      { path: "product-categories", element: <Navigate to="../catalog?tab=categories" replace /> },
      { path: "products", element: <Navigate to="../catalog?tab=products" replace /> },
      { path: "inventory", element: <Inventory /> },
      { path: "inventory-transfers", element: <InventoryTransfersPage /> },
      {
        path: "fundation-tags",
        element: (
          <GlobalAdminOnly>
            <FundationTags />
          </GlobalAdminOnly>
        ),
      },
      { path: "kitchen", element: <KitchenView /> },
      { path: "cash-register-history", element: <CashRegisterHistory /> },
      {
        path: "security-cameras",
        element: (
          <GlobalAdminOnly>
            <SecurityCameras />
          </GlobalAdminOnly>
        ),
      },
      { path: "admin", element: <AdminPage /> },
      { path: "reports", element: <ReportsPage /> },

    ],
  },
  {
    path: "client-view/:terminalId",
    element: <ClientView />,
  },
]);
