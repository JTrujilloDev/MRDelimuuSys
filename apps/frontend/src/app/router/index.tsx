import { createBrowserRouter } from "react-router";
import { AuthLayout } from "../../layouts/AuthLayout";
import Login from "../../pages/Login";
import { MainLayout } from "../../layouts/MainLayout";
import POS from "../../pages/POS";
import ProductCategories from "../../modules/categories/pages";
import Products from "../../modules/products/pages";
import Inventory from "../../modules/POSInventory/pages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    children: [{ path: "login", element: <Login /> }],
  },
  {
    path: "/app",
    element: <MainLayout />,
    children: [
      { path: "POS", element: <POS /> },
      { path: "money-movements", element: <h1>Movimientos de Dinero</h1> },
      { path: "product-categories", element: <ProductCategories /> },
      { path: "products", element: <Products /> },
      { path: "inventory", element: <Inventory /> },
    ],
  },
]);
