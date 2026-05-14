import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../../lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

import {
  Bot,
  Send,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

interface Mensaje {
  id: string;
  tipo: "usuario" | "ia";
  contenido: string;
  marcaTiempo: string;
}

interface UsuarioSesion {
  id?: number;
  nombre?: string;
  email?: string;
  rol?: "admin" | "user";
  estado?: string;
}

const preguntasAdmin = [
  "¿Cuántos mangas se produjeron hoy?",
  "¿Cuál fue el manga más producido esta semana?",
  "¿Qué materia prima está por agotarse?",
  "¿Qué línea de impresión tuvo mayor actividad?",
  "¿Qué recomendaciones hay para mejorar la producción?",
  "Muestra las tendencias de producción del último mes",
];

const preguntasUser = [
  "¿Cuántos mangas se produjeron hoy?",
  "¿Qué mangas se fabricaron recientemente?",
  "¿Qué materias primas tenemos disponibles?",
  "Dame un resumen operativo del día",
];

const insightsAdmin = [
  {
    titulo: "Producción Inteligente",
    descripcion:
      "La IA analiza producción, mermas e inventario con datos reales del ERP.",
    icono: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/20 border-green-500/30",
  },
  {
    titulo: "Predicción de Inventario",
    descripcion:
      "Detecta materiales críticos y posibles faltantes automáticamente.",
    icono: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20 border-yellow-500/30",
  },
  {
    titulo: "Optimización Operativa",
    descripcion:
      "Obtén recomendaciones para mejorar eficiencia y reducir mermas.",
    icono: Lightbulb,
    color: "text-cyan-400",
    bg: "bg-cyan-500/20 border-cyan-500/30",
  },
];

const insightsUser = [
  {
    titulo: "Consulta Operativa",
    descripcion:
      "Consulta producción del día y actividad reciente del sistema.",
    icono: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/20 border-green-500/30",
  },
  {
    titulo: "Inventario General",
    descripcion:
      "Revisa disponibilidad general de materiales registrados.",
    icono: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20 border-yellow-500/30",
  },
  {
    titulo: "Resumen Diario",
    descripcion:
      "Obtén respuestas básicas sobre el estado operativo actual.",
    icono: Lightbulb,
    color: "text-cyan-400",
    bg: "bg-cyan-500/20 border-cyan-500/30",
  },
];

const obtenerSesion = (): UsuarioSesion => {
  try {
    return JSON.parse(localStorage.getItem("mangaforge_session") || "{}");
  } catch {
    return {};
  }
};

export function AIAssistantPage() {
  const sesion = obtenerSesion();
  const esAdmin = sesion.rol === "admin";

  const preguntasSugeridas = esAdmin ? preguntasAdmin : preguntasUser;
  const insightsIA = esAdmin ? insightsAdmin : insightsUser;

  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "1",
      tipo: "ia",
      contenido: esAdmin
        ? "¡Hola! Soy MangaForge IA. Tienes acceso completo para analizar producción, inventario, mermas, eficiencia y tendencias del ERP."
        : "¡Hola! Soy MangaForge IA. Puedes consultar información operativa básica como producción del día, productos recientes e inventario general.",
      marcaTiempo: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [valorEntrada, setValorEntrada] = useState("");
  const [estaEscribiendo, setEstaEscribiendo] = useState(false);

  const manejarEnviarMensaje = async (mensaje: string) => {
    if (!mensaje.trim()) return;

    const sesionActual = obtenerSesion();

    const mensajeUsuario: Mensaje = {
      id: Date.now().toString(),
      tipo: "usuario",
      contenido: mensaje,
      marcaTiempo: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMensajes((prev) => [...prev, mensajeUsuario]);
    setValorEntrada("");
    setEstaEscribiendo(true);

    try {
      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: {
          mensaje,
          usuario: {
            id: sesionActual.id,
            rol: sesionActual.rol || "user",
            nombre: sesionActual.nombre,
          },
        },
      });

      if (error) {
        throw error;
      }

      const respuesta = data?.respuesta || "No pude generar respuesta.";

      const mensajeIA: Mensaje = {
        id: (Date.now() + 1).toString(),
        tipo: "ia",
        contenido: respuesta,
        marcaTiempo: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMensajes((prev) => [...prev, mensajeIA]);

      await supabase.from("consultas_ia").insert([
        {
          pregunta: mensaje,
          respuesta,
        },
      ]);
    } catch (error) {
      console.error(error);

      const mensajeError: Mensaje = {
        id: (Date.now() + 2).toString(),
        tipo: "ia",
        contenido: "Ocurrió un error al conectar con la IA o Supabase.",
        marcaTiempo: new Date().toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMensajes((prev) => [...prev, mensajeError]);
    }

    setEstaEscribiendo(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Bot className="w-8 h-8 text-white" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Asistente Inteligente
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            {esAdmin
              ? "IA conectada con acceso administrativo"
              : "IA conectada con acceso limitado de usuario"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-100">
            {esAdmin ? "Capacidades IA" : "Consultas permitidas"}
          </h3>

          {insightsIA.map((insight, indice) => {
            const Icono = insight.icono;

            return (
              <motion.div
                key={indice}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: indice * 0.1 }}
              >
                <Card
                  className={`bg-slate-900/50 border backdrop-blur-sm ${insight.bg}`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className={insight.color}>
                        <Icono className="w-5 h-5" />
                      </div>

                      <div className="flex-1">
                        <h4 className={`font-medium ${insight.color} mb-1`}>
                          {insight.titulo}
                        </h4>

                        <p className="text-sm text-slate-400">
                          {insight.descripcion}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Preguntas */}
          <div className="pt-4">
            <h3 className="font-semibold text-slate-100 mb-3">
              Preguntas sugeridas
            </h3>

            <div className="space-y-2">
              {preguntasSugeridas.map((pregunta, indice) => (
                <button
                  key={indice}
                  onClick={() => manejarEnviarMensaje(pregunta)}
                  className="w-full text-left px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700 hover:border-purple-500/50 rounded-lg text-sm text-slate-300 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>{pregunta}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm h-[700px] flex flex-col">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-100">Chat IA</CardTitle>

                <Badge
                  className={
                    esAdmin
                      ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                      : "bg-green-500/20 text-green-400 border-green-500/30"
                  }
                >
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
                  {esAdmin ? "Acceso admin" : "Acceso user"}
                </Badge>
              </div>
            </CardHeader>

            {/* Mensajes */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence>
                {mensajes.map((mensaje, indice) => (
                  <motion.div
                    key={mensaje.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: indice * 0.05 }}
                    className={`flex ${
                      mensaje.tipo === "usuario"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] ${
                        mensaje.tipo === "usuario"
                          ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
                          : "bg-slate-800/50 text-slate-100 border border-slate-700"
                      } rounded-2xl px-4 py-3`}
                    >
                      {mensaje.tipo === "ia" && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>

                          <span className="text-xs text-slate-400">
                            MangaForge IA
                          </span>
                        </div>
                      )}

                      <div className="text-sm whitespace-pre-line">
                        {mensaje.contenido}
                      </div>

                      <div
                        className={`text-xs mt-2 ${
                          mensaje.tipo === "usuario"
                            ? "text-purple-200"
                            : "text-slate-500"
                        }`}
                      >
                        {mensaje.marcaTiempo}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Escribiendo */}
              {estaEscribiendo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>

                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />

                        <div
                          className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />

                        <div
                          className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </CardContent>

            {/* Input */}
            <div className="p-4 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  manejarEnviarMensaje(valorEntrada);
                }}
                className="flex gap-2"
              >
                <Input
                  value={valorEntrada}
                  onChange={(e) => setValorEntrada(e.target.value)}
                  placeholder={
                    esAdmin
                      ? "Pregunta sobre producción, inventario, mermas o analítica..."
                      : "Pregunta sobre producción del día o inventario general..."
                  }
                  className="flex-1 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 focus:border-purple-500"
                  disabled={estaEscribiendo}
                />

                <Button
                  type="submit"
                  disabled={!valorEntrada.trim() || estaEscribiendo}
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 px-6"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}