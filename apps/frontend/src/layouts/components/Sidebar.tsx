import Logo from "/DeliLogo.png";
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router";
import { Tooltip } from "@heroui/react";
import {
  BookOpen,
  Camera,
  ChefHat,
  History,
  MapPin,
  MonitorSmartphone,
  Moon,
  Package,
  Repeat2,
  ShieldCheck,
  ShoppingCart,
  Sun,
  Tag,
  UserCog,
  UserRound,
} from "lucide-react";
import { LuLogOut } from "react-icons/lu";
import { useTheme } from "../../app/providers";
import { useAuth } from "../../app/auth/AuthProvider";
import type { UserRole } from "../../app/auth/auth.service";

const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrador del punto",
  CASHIER: "Cajera",
  KITCHEN: "Cocina",
  WAITER: "Mesero",
  BAKERY: "Panadería",
};

const Sidebar = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { state, logout } = useAuth();
  const activeContext = state!.activeContext!;
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const roleLabel = state!.user.isGlobalAdmin
    ? "Administrador general"
    : roleLabels[activeContext.role];

  useEffect(() => {
    if (!isProfileOpen) return;

    const closeWhenClickingOutside = (event: PointerEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        if (profileRef.current?.contains(document.activeElement)) {
          (document.activeElement as HTMLElement).blur();
        }
      }
    };

    document.addEventListener("pointerdown", closeWhenClickingOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenClickingOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [isProfileOpen]);

  const items = [
    { title: "Punto de Venta", url: "pos", icon: ShoppingCart },
    { title: "Historial de cajas", url: "cash-register-history", icon: History },
    { title: "Catálogo", url: "catalog", icon: BookOpen },
    {title: "Inventario" , url: "inventory", icon: Package},
    ...(activeContext.store.kitchenMode === "TICKETS"
      ? [{ title: "Cocina", url: "kitchen", icon: ChefHat }]
      : []),
    ...(state?.user.isGlobalAdmin
      ? [{ title: "Administración", url: "admin", icon: UserCog }]
      : []),
    { title: "Cámaras", url: "security-cameras", icon: Camera },
    {title : "Etiquetas", url: "fundation-tags", icon: Tag}
  ];
  return (
    <div className="flex h-full w-24 flex-col items-center gap-4 rounded-tr-[24px] rounded-br-[24px] border-r border-border/70 bg-pos-surface/95 py-4 shadow-[0_18px_40px_-30px_rgba(84,56,32,0.45)]">
      <img src={Logo} alt="Logo" className="mt-4 w-14 rounded-2xl" />

      <div ref={profileRef} className="group relative mt-6">
        <button
          type="button"
          onClick={(event) => {
            if (isProfileOpen) {
              setIsProfileOpen(false);
              event.currentTarget.blur();
              return;
            }
            setIsProfileOpen(true);
          }}
          className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-foreground outline-none transition-all hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Ver usuario y punto activos"
          aria-expanded={isProfileOpen}
          aria-controls="active-user-context"
        >
          <UserRound className="h-7 w-7" />
          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-pos-surface bg-success" />
        </button>

        <div
          id="active-user-context"
          role="status"
          className={`absolute left-[4.5rem] top-0 z-50 w-72 origin-left rounded-2xl border border-border bg-pos-surface p-4 text-foreground shadow-xl transition-all duration-150 group-hover:visible group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:scale-100 group-focus-within:opacity-100 ${
            isProfileOpen
              ? "visible scale-100 opacity-100"
              : "invisible scale-95 opacity-0"
          }`}
        >
          <div className="border-b border-border pb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sesión activa
            </p>
            <p className="mt-1 truncate text-base font-black">{state!.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{state!.user.email}</p>
          </div>

          <dl className="mt-3 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="text-xs text-muted-foreground">Rol</dt>
                <dd className="font-bold">{roleLabel}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="text-xs text-muted-foreground">Punto / sede</dt>
                <dd className="font-bold">{activeContext.store.name}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <dt className="text-xs text-muted-foreground">Terminal</dt>
                <dd className="font-bold">{activeContext.terminal.name}</dd>
              </div>
            </div>
          </dl>
          <p className="mt-4 text-[11px] leading-4 text-muted-foreground">
            Haz clic nuevamente o presiona Esc para cerrar.
          </p>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-1">
        {items.map((item) => (
          <Tooltip key={item.url}>
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
            <Tooltip.Content>{item.title}</Tooltip.Content>
          </Tooltip>
        ))}
      </div>

      <div className="mt-auto flex shrink-0 flex-col items-center gap-3">
        {state?.stores.length && state.stores.length > 1 ? (
          <Tooltip>
            <button
              type="button"
              onClick={() => navigate("/select-context?change=1")}
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
              aria-label="Cambiar punto"
            >
              <Repeat2 className="h-5 w-5" />
            </button>
            <Tooltip.Content>Cambiar punto</Tooltip.Content>
          </Tooltip>
        ) : null}
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
            <LuLogOut
              size={22}
              onClick={() => void logout().then(() => navigate("/login", { replace: true }))}
            />
            <Tooltip.Content>Cerrar sesión</Tooltip.Content>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
