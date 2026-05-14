import { Outlet, useNavigate, useLocation } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";

import {
  LayoutDashboard,
  Package,
  Factory,
  Bot,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Users,
  BookOpen,
  ClipboardList,
  Recycle,
} from "lucide-react";

const allMenuItems = [
  {
    path: "/admin",
    icon: LayoutDashboard,
    label: "Panel Principal",
    roles: ["admin"],
  },

  {
    path: "/user",
    icon: Users,
    label: "Panel Usuario",
    roles: ["admin", "user"],
  },

  {
    path: "/inventory",
    icon: Package,
    label: "Inventario",
    roles: ["admin"],
  },

  {
    path: "/mangas",
    icon: BookOpen,
    label: "Mangas",
    roles: ["admin"],
  },

  {
    path: "/recipes",
    icon: ClipboardList,
    label: "Recetas",
    roles: ["admin"],
  },

  {
    path: "/production",
    icon: Factory,
    label: "Producción",
    roles: ["admin"],
  },

  {
    path: "/waste",
    icon: Recycle,
    label: "Mermas",
    roles: ["admin"],
  },

  {
    path: "/ai-assistant",
    icon: Bot,
    label: "Asistente IA",
    roles: ["admin", "user"],
  },

  {
    path: "/analytics",
    icon: BarChart3,
    label: "Analítica",
    roles: ["admin"],
  },
];

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications] = useState(3);

  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    const sesion = localStorage.getItem("mangaforge_session");

    if (!sesion) {
      navigate("/login");
      return;
    }

    const userData = JSON.parse(sesion);

    setUsuario(userData);

    const rol = userData?.rol;

    // Protección de rutas
    if (rol !== "admin") {
      const rutasAdmin = [
        "/admin",
        "/inventory",
        "/mangas",
        "/recipes",
        "/production",
        "/waste",
        "/analytics",
        "/settings",
      ];

      if (rutasAdmin.includes(location.pathname)) {
        navigate("/user");
      }
    }
  }, [location.pathname, navigate]);

  const menuItems = useMemo(() => {
    if (!usuario) return [];

    return allMenuItems.filter((item) =>
      item.roles.includes(usuario.rol)
    );
  }, [usuario]);

  const handleLogout = () => {
    localStorage.removeItem("mangaforge_session");
    navigate("/login");
  };

  if (!usuario) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="relative border-r border-slate-800 bg-slate-900/50 backdrop-blur-xl flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {sidebarOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>

              <div>
                <div className="font-semibold text-slate-100">
                  MangaForge
                </div>

                <div className="text-xs text-slate-500">
                  ERP System
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* MENU */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.path}
                onClick={() => navigate(item.path)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                  ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/30 text-purple-300"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }
                `}
              >
                <Icon
                  className={`${
                    sidebarOpen
                      ? "w-5 h-5"
                      : "w-6 h-6 mx-auto"
                  } shrink-0`}
                />

                {sidebarOpen && (
                  <span className="truncate">
                    {item.label}
                  </span>
                )}

                {isActive && sidebarOpen && (
                  <motion.div
                    layoutId="active-pill"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          {usuario.rol === "admin" && (
            <Button
              variant="ghost"
              onClick={() => navigate("/settings")}
              className={`w-full justify-start gap-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 ${
                !sidebarOpen && "justify-center"
              }`}
            >
              <Settings
                className={`${
                  sidebarOpen ? "w-5 h-5" : "w-6 h-6"
                } shrink-0`}
              />

              {sidebarOpen && <span>Configuración</span>}
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full justify-start gap-3 text-slate-400 hover:text-red-400 hover:bg-slate-800/50 ${
              !sidebarOpen && "justify-center"
            }`}
          >
            <LogOut
              className={`${
                sidebarOpen ? "w-5 h-5" : "w-6 h-6"
              } shrink-0`}
            />

            {sidebarOpen && <span>Cerrar Sesión</span>}
          </Button>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          {sidebarOpen ? (
            <X className="w-3 h-3" />
          ) : (
            <Menu className="w-3 h-3" />
          )}
        </button>
      </motion.aside>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {menuItems.find(
                (item) => item.path === location.pathname
              )?.label || "Panel"}
            </h2>

            <p className="text-sm text-slate-500">
              Bienvenido de nuevo, {usuario.nombre}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* NOTIFICATIONS */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-slate-400 hover:text-slate-200"
            >
              <Bell className="w-5 h-5" />

              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {notifications}
                </Badge>
              )}
            </Button>

            {/* PROFILE */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right">
                <div className="text-sm font-medium text-slate-200">
                  {usuario.nombre}
                </div>

                <div className="text-xs text-slate-500">
                  {usuario.rol === "admin"
                    ? "Administrador del Sistema"
                    : "Usuario del Sistema"}
                </div>
              </div>

              <Avatar className="h-10 w-10 border-2 border-purple-500/30">
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-cyan-600 text-white">
                  {usuario.nombre?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* PAGE */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}