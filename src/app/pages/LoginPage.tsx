import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Alert, AlertDescription } from "../components/ui/alert";

import { motion } from "motion/react";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

interface UsuarioSesion {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "user";
  estado: string;
}

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess(false);

    const correo = email.trim().toLowerCase();

    if (!correo || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.rpc("login_usuario_sistema", {
      p_email: correo,
      p_password: password,
    });

    if (error) {
      console.error("Error login:", error.message);
      setError("No se pudo iniciar sesión. Revisa la conexión o la base de datos.");
      setIsLoading(false);
      return;
    }

    const usuario = data?.[0] as UsuarioSesion | undefined;

    if (!usuario) {
      setError("Correo o contraseña incorrectos, o usuario inactivo.");
      setIsLoading(false);
      return;
    }

    if (usuario.rol !== "admin" && usuario.rol !== "user") {
      setError("Este usuario tiene un rol inválido. Contacta al administrador.");
      setIsLoading(false);
      return;
    }

    localStorage.setItem("mangaforge_session", JSON.stringify(usuario));

    if (rememberMe) {
      localStorage.setItem("mangaforge_remember_email", correo);
    } else {
      localStorage.removeItem("mangaforge_remember_email");
    }

    setSuccess(true);

    setTimeout(() => {
      if (usuario.rol === "admin") {
        navigate("/admin");
      } else {
        navigate("/user");
      }
    }, 700);
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950">
      {/* Columna izquierda */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950/30 to-slate-900">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(139, 92, 246, 0.1) 2px, rgba(139, 92, 246, 0.1) 4px),
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 92, 246, 0.1) 2px, rgba(139, 92, 246, 0.1) 4px)
              `,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />

        <div className="absolute inset-0">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"
              style={{
                top: `${20 + i * 10}%`,
                left: 0,
                right: 0,
              }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ delay: i * 0.1, duration: 1.5 }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-xl shadow-purple-500/30">
                <BookOpen className="w-9 h-9 text-white" />
              </div>

              <div>
                <h1 className="text-3xl font-bold text-white">MangaForge ERP</h1>
                <p className="text-purple-300 text-sm">Sistema Empresarial</p>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Sistema Inteligente para
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Administración Editorial
              </span>
            </h2>

            <p className="text-slate-400 text-lg mb-12 leading-relaxed">
              Plataforma integral para gestión de producción, inventario y análisis inteligente
              de manufactura editorial.
            </p>

            <div className="space-y-4">
              {[
                "Control de producción en tiempo real",
                "Gestión inteligente de inventario",
                "Analítica avanzada con IA",
                "Acceso por roles de usuario",
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-slate-300">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-8 flex items-center gap-2 px-4 py-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-slate-400">Potenciado con IA</span>
        </motion.div>
      </div>

      {/* Columna derecha */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 lg:hidden">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 shadow-lg shadow-purple-500/30">
              <BookOpen className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">MangaForge ERP</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Iniciar Sesión</h2>
            <p className="text-slate-400">Accede con tu usuario registrado</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <Alert className="bg-green-500/10 border-green-500/30 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Acceso concedido. Redirigiendo...</AlertDescription>
              </Alert>
            </motion.div>
          )}

          <div className="backdrop-blur-xl bg-slate-900/50 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Correo Electrónico
                </Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@mangaforge.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-11"
                  disabled={isLoading || success}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Contraseña
                </Label>

                <div className="relative">
                  <Input
                    id="password"
                    type={mostrarPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500 focus:ring-purple-500/20 h-11 pr-11"
                    disabled={isLoading || success}
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    disabled={isLoading || success}
                  >
                    {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-slate-700 data-[state=checked]:bg-purple-600"
                    disabled={isLoading || success}
                  />

                  <Label htmlFor="remember" className="text-sm text-slate-400 cursor-pointer">
                    Recordarme
                  </Label>
                </div>

                <span className="text-sm text-slate-500">
                  Recuperación vía admin
                </span>
              </div>

              <Button
                type="submit"
                disabled={isLoading || success}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-purple-500/50 hover:scale-[1.02] h-11"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando credenciales...
                  </div>
                ) : success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Acceso concedido
                  </div>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>
          </div>

          <div className="mt-6 p-4 bg-slate-900/30 border border-slate-800/50 rounded-lg">
            <p className="text-xs text-slate-500 text-center">
              Usa los usuarios registrados desde Configuración.
            </p>
          </div>

          <p className="text-center text-xs text-slate-600 mt-8">
            © 2026 MangaForge ERP. Sistema Inteligente de Producción Editorial.
          </p>
        </motion.div>
      </div>
    </div>
  );
}