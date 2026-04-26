import Logo from "/DeliLogo.png";
import { NavLink, useNavigate } from "react-router";
import { Tooltip } from "@heroui/react";
import { BiUser } from "react-icons/bi";
import { Moon, Package, ShoppingCart, Sun, Tag } from "lucide-react";
import { LuLogOut } from "react-icons/lu";
import { useTheme } from "../../app/providers";

const Sidebar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const items = [
    { title: "Punto de Venta", url: "pos", icon: ShoppingCart },
    { title: "Categorías", url: "product-categories", icon: Tag },
    { title: "Productos", url: "products", icon: Package },
  ];
  return (
    <div className="flex h-full w-24 flex-col items-center gap-4 rounded-tr-[24px] rounded-br-[24px] border-r border-border/70 bg-pos-surface/95 py-4 shadow-[0_18px_40px_-30px_rgba(84,56,32,0.45)]">
      <img src={Logo} alt="Logo" className="mt-4 w-14 rounded-2xl" />

      <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground">
        <BiUser size={28} />
      </div>

      <div className="mt-4 flex flex-col items-center gap-4">
        {items.map((item) => (
          <div key={item.url}>
            <NavLink
              to={item.url}
              end
              className={({ isActive }) =>
                `flex h-11 w-11 items-center justify-center rounded-2xl transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <Tooltip>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
            aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Tooltip.Content>
            {theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          </Tooltip.Content>
        </Tooltip>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:cursor-pointer hover:bg-destructive/10 hover:text-destructive">
          <Tooltip>
            <LuLogOut size={22} onClick={() => navigate("/login")} />
            <Tooltip.Content>Cerrar sesión</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
