import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { motion } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import {
  Settings,
  UserPlus,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Search,
  Power,
  PowerOff,
  KeyRound,
} from "lucide-react";

interface UsuarioSistema {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  created_at: string;
}

const roles = [
  { value: "admin", label: "Administrador" },
  { value: "user", label: "Usuario" },
];

const estadoBadge = (estado: string) =>
  estado === "activo"
    ? "border-green-500/30 text-green-400 bg-green-500/10"
    : "border-red-500/30 text-red-400 bg-red-500/10";

const rolBadge = (rol: string) => {
  if (rol === "admin")
    return "border-purple-500/30 text-purple-300 bg-purple-500/10";

  return "border-cyan-500/30 text-cyan-300 bg-cyan-500/10";
};

export function SettingsPage() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [usuarioPassword, setUsuarioPassword] = useState<UsuarioSistema | null>(null);
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarNuevaPassword, setConfirmarNuevaPassword] = useState("");
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [mostrarNuevaPassword, setMostrarNuevaPassword] = useState(false);

  const [formUsuario, setFormUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmarPassword: "",
    rol: "capturista",
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setCargando(true);

    const { data, error } = await supabase
      .from("usuarios_sistema")
      .select("id, nombre, email, rol, estado, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar usuarios:", error.message);
      setUsuarios([]);
    } else {
      setUsuarios(data || []);
    }

    setCargando(false);
  };

  const limpiarFormulario = () => {
    setFormUsuario({
      nombre: "",
      email: "",
      password: "",
      confirmarPassword: "",
      rol: "capturista",
    });
    setMostrarPassword(false);
  };

  const validarFormulario = () => {
    const nombre = formUsuario.nombre.trim();
    const email = formUsuario.email.trim().toLowerCase();
    const password = formUsuario.password;

    if (!nombre) {
      alert("Ingresa el nombre del usuario.");
      return null;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Ingresa un correo válido.");
      return null;
    }

    if (password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres.");
      return null;
    }

    if (password !== formUsuario.confirmarPassword) {
      alert("Las contraseñas no coinciden.");
      return null;
    }

    return { nombre, email, password, rol: formUsuario.rol };
  };

  const registrarUsuario = async () => {
    const datos = validarFormulario();
    if (!datos) return;

    const existe = usuarios.some(
      (usuario) => usuario.email.toLowerCase() === datos.email
    );

    if (existe) {
      alert("Ya existe un usuario con ese correo.");
      return;
    }

    setGuardando(true);

    const { error } = await supabase.rpc("registrar_usuario_sistema", {
      p_nombre: datos.nombre,
      p_email: datos.email,
      p_password: datos.password,
      p_rol: datos.rol,
    });

    if (error) {
      console.error("Error al registrar usuario:", error.message);
      alert("No se pudo registrar el usuario.");
      setGuardando(false);
      return;
    }

    limpiarFormulario();
    await cargarUsuarios();
    setGuardando(false);
  };

  const cambiarEstadoUsuario = async (usuario: UsuarioSistema) => {
    const nuevoEstado = usuario.estado === "activo" ? "inactivo" : "activo";
    const confirmar = confirm(`¿Seguro que quieres marcar este usuario como ${nuevoEstado}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from("usuarios_sistema")
      .update({ estado: nuevoEstado })
      .eq("id", usuario.id);

    if (error) {
      console.error("Error al cambiar estado:", error.message);
      alert("No se pudo actualizar el estado del usuario.");
      return;
    }

    await cargarUsuarios();
  };

  const abrirModalPassword = (usuario: UsuarioSistema) => {
    setUsuarioPassword(usuario);
    setNuevaPassword("");
    setConfirmarNuevaPassword("");
    setMostrarNuevaPassword(false);
  };

  const cerrarModalPassword = () => {
    setUsuarioPassword(null);
    setNuevaPassword("");
    setConfirmarNuevaPassword("");
    setMostrarNuevaPassword(false);
    setGuardandoPassword(false);
  };

  const cambiarPasswordUsuario = async () => {
    if (!usuarioPassword) return;

    if (nuevaPassword.length < 8) {
      alert("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (nuevaPassword !== confirmarNuevaPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    setGuardandoPassword(true);

    const { error } = await supabase.rpc("actualizar_password_usuario_sistema", {
      p_usuario_id: usuarioPassword.id,
      p_nueva_password: nuevaPassword,
    });

    if (error) {
      console.error("Error al actualizar contraseña:", error.message);
      alert("No se pudo actualizar la contraseña.");
      setGuardandoPassword(false);
      return;
    }

    alert("Contraseña actualizada correctamente.");
    cerrarModalPassword();
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const texto = busqueda.toLowerCase();
    return (
      usuario.nombre.toLowerCase().includes(texto) ||
      usuario.email.toLowerCase().includes(texto) ||
      usuario.rol.toLowerCase().includes(texto) ||
      usuario.estado.toLowerCase().includes(texto)
    );
  });

  const estadisticas = useMemo(() => {
    return {
      total: usuarios.length,
      activos: usuarios.filter((u) => u.estado === "activo").length,
      inactivos: usuarios.filter((u) => u.estado === "inactivo").length,
      admins: usuarios.filter((u) => u.rol === "admin").length,
    };
  }, [usuarios]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Settings className="w-8 h-8 text-white" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Configuración del Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra usuarios, roles y accesos de MangaForge ERP.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Usuarios</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {estadisticas.total}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Activos</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {estadisticas.activos}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Inactivos</p>
              <p className="text-2xl font-bold text-red-400 mt-1">
                {estadisticas.inactivos}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Administradores</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">
                {estadisticas.admins}
              </p>
            </div>
            <ShieldCheck className="w-8 h-8 text-cyan-400" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-4 bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Registrar usuario
            </CardTitle>
            <p className="text-sm text-slate-500">
              La contraseña se guarda con hash usando pgcrypto en Supabase.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Nombre</Label>
              <Input
                value={formUsuario.nombre}
                onChange={(e) =>
                  setFormUsuario({ ...formUsuario, nombre: e.target.value })
                }
                placeholder="Ej: Jared Méndez"
                className="bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Correo</Label>
              <Input
                type="email"
                value={formUsuario.email}
                onChange={(e) =>
                  setFormUsuario({ ...formUsuario, email: e.target.value })
                }
                placeholder="usuario@empresa.com"
                className="bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Rol</Label>
              <Select
                value={formUsuario.rol}
                onValueChange={(value) =>
                  setFormUsuario({ ...formUsuario, rol: value })
                }
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>

                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  {roles.map((rol) => (
                    <SelectItem
                      key={rol.value}
                      value={rol.value}
                      className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
                    >
                      {rol.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Contraseña</Label>
              <div className="relative">
                <Input
                  type={mostrarPassword ? "text" : "password"}
                  value={formUsuario.password}
                  onChange={(e) =>
                    setFormUsuario({ ...formUsuario, password: e.target.value })
                  }
                  placeholder="Mínimo 8 caracteres"
                  className="bg-slate-800/50 border-slate-700 text-slate-100 pr-11"
                />

                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {mostrarPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Confirmar contraseña</Label>
              <Input
                type={mostrarPassword ? "text" : "password"}
                value={formUsuario.confirmarPassword}
                onChange={(e) =>
                  setFormUsuario({
                    ...formUsuario,
                    confirmarPassword: e.target.value,
                  })
                }
                placeholder="Repite la contraseña"
                className="bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4">
              <p className="text-sm text-slate-300 font-medium mb-2">
                Seguridad
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                El frontend no guarda contraseñas. Supabase genera el hash con{" "}
                <span className="text-cyan-300">crypt + gen_salt('bf')</span>.
              </p>
            </div>

            <Button
              onClick={registrarUsuario}
              disabled={guardando}
              className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {guardando ? "Guardando..." : "Registrar usuario"}
            </Button>
          </CardContent>
        </Card>

        <Card className="xl:col-span-8 bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-slate-100">
                  Usuarios registrados
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Consulta y administra usuarios del sistema.
                </p>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar usuario..."
                  className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {cargando ? (
              <div className="text-center py-12 text-slate-400">
                Cargando usuarios...
              </div>
            ) : (
              <div className="space-y-3">
                {usuariosFiltrados.map((usuario, index) => (
                  <motion.div
                    key={usuario.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white font-semibold">
                        {usuario.nombre
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-100">
                            {usuario.nombre}
                          </h3>

                          <Badge
                            variant="outline"
                            className={rolBadge(usuario.rol)}
                          >
                            {roles.find((r) => r.value === usuario.rol)
                              ?.label || usuario.rol}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={estadoBadge(usuario.estado)}
                          >
                            {usuario.estado === "activo" ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-sm text-slate-400 flex-wrap">
                          <span>{usuario.email}</span>
                          <span>•</span>
                          <span>
                            Registrado:{" "}
                            {new Date(usuario.created_at).toLocaleDateString(
                              "es-MX"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => abrirModalPassword(usuario)}
                        className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        Cambiar contraseña
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => cambiarEstadoUsuario(usuario)}
                        className={
                          usuario.estado === "activo"
                            ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                            : "border-green-500/30 text-green-400 hover:bg-green-500/10"
                        }
                      >
                        {usuario.estado === "activo" ? (
                          <>
                            <PowerOff className="w-4 h-4 mr-2" />
                            Desactivar
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4 mr-2" />
                            Activar
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}

                {usuariosFiltrados.length === 0 && (
                  <div className="text-center py-16">
                    <Users className="w-14 h-14 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400">
                      No se encontraron usuarios.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {usuarioPassword && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-white" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Cambiar contraseña
                </h2>
                <p className="text-sm text-slate-400">
                  {usuarioPassword.nombre}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3">
                <p className="text-xs text-yellow-200 leading-relaxed">
                  Esta acción actualizará la contraseña del usuario. No se
                  mostrará ni se guardará en texto plano.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Nueva contraseña</Label>

                <div className="relative">
                  <Input
                    type={mostrarNuevaPassword ? "text" : "password"}
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="bg-slate-800/50 border-slate-700 text-slate-100 pr-11"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarNuevaPassword(!mostrarNuevaPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {mostrarNuevaPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Confirmar contraseña</Label>
                <Input
                  type={mostrarNuevaPassword ? "text" : "password"}
                  value={confirmarNuevaPassword}
                  onChange={(e) => setConfirmarNuevaPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={cerrarModalPassword}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </Button>

                <Button
                  onClick={cambiarPasswordUsuario}
                  disabled={guardandoPassword}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                >
                  {guardandoPassword
                    ? "Guardando..."
                    : "Actualizar contraseña"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}