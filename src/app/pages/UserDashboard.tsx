import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

import {
  BookOpen,
  Package,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ProductoManga {
  id: number;
  titulo: string;
  volumen: number;
  tipo_edicion?: string | null;
}

interface ProduccionDB {
  id: number;
  fecha: string;
  producto_id: number;
  cantidad_producida: number;
  linea_impresion: string | null;
  estado_produccion: string | null;
  operador: string | null;
  created_at: string;
  productos_manga?: ProductoManga | null;
}

interface MaterialDB {
  id: number;
  nombre: string;
  categoria: string;
  cantidad_disponible: number;
  unidad: string;
  stock_minimo: number;
  estado: string;
}

interface PuntoProduccion {
  hora: string;
  unidades: number;
}

interface MangaReciente {
  titulo: string;
  cantidad: number;
  estado: string;
  linea: string;
}

interface Actividad {
  hora: string;
  accion: string;
  detalle: string;
  tipo: "exito" | "info" | "advertencia";
}

interface EstadoInventario {
  item: string;
  nivel: number;
  estado: "bueno" | "advertencia" | "critico";
}

const obtenerFechaHoy = () => {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  });
};

const formatearHora = (fechaISO?: string | null) => {
  if (!fechaISO) return "--:--";

  return new Date(fechaISO).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const normalizarEstado = (estado?: string | null) => {
  const valor = (estado || "").trim().toLowerCase();

  if (
    valor.includes("finalizado") ||
    valor.includes("completado") ||
    valor.includes("terminado")
  ) {
    return "completado";
  }

  if (
    valor.includes("proceso") ||
    valor.includes("en_proceso") ||
    valor.includes("produccion")
  ) {
    return "en-proceso";
  }

  return "pendiente";
};

const obtenerLetraLinea = (linea?: string | null) => {
  const valor = (linea || "Sin línea")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (valor === "a" || valor === "linea a") return "A";
  if (valor === "b" || valor === "linea b") return "B";
  if (valor === "c" || valor === "linea c") return "C";
  if (valor === "d" || valor === "linea d") return "D";

  return "—";
};

export function UserDashboard() {
  const [producciones, setProducciones] = useState<ProduccionDB[]>([]);
  const [materiales, setMateriales] = useState<MaterialDB[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);

    const [produccionRes, materialesRes] = await Promise.all([
      supabase
        .from("produccion")
        .select(`
          *,
          productos_manga (
            id,
            titulo,
            volumen,
            tipo_edicion
          )
        `)
        .order("created_at", { ascending: false })
        .limit(50),

      supabase
        .from("materia_prima")
        .select("*")
        .order("cantidad_disponible", { ascending: true }),
    ]);

    if (produccionRes.error) {
      console.error("Error cargando producción:", produccionRes.error.message);
      setProducciones([]);
    } else {
      setProducciones((produccionRes.data || []) as ProduccionDB[]);
    }

    if (materialesRes.error) {
      console.error("Error cargando inventario:", materialesRes.error.message);
      setMateriales([]);
    } else {
      setMateriales((materialesRes.data || []) as MaterialDB[]);
    }

    setCargando(false);
  };

  const datos = useMemo(() => {
    const hoy = obtenerFechaHoy();

    const produccionesHoy = producciones.filter((p) => p.fecha === hoy);

    const totalHoy = produccionesHoy.reduce(
      (sum, p) => sum + Number(p.cantidad_producida || 0),
      0
    );

    const lineasActivas = new Set(
      produccionesHoy
        .map((p) => p.linea_impresion)
        .filter(Boolean)
    ).size;

    const completadosHoy = produccionesHoy.filter(
      (p) => normalizarEstado(p.estado_produccion) === "completado"
    ).length;

    const pendientesHoy = produccionesHoy.filter(
      (p) => normalizarEstado(p.estado_produccion) === "pendiente"
    ).length;

    const produccionPorHoraMap = new Map<string, number>();

    produccionesHoy.forEach((p) => {
      const hora = formatearHora(p.created_at);
      produccionPorHoraMap.set(
        hora,
        (produccionPorHoraMap.get(hora) || 0) + Number(p.cantidad_producida || 0)
      );
    });

    const produccionHoyGrafica: PuntoProduccion[] = Array.from(
      produccionPorHoraMap.entries()
    )
      .map(([hora, unidades]) => ({
        hora,
        unidades,
      }))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    const mangasRecientes: MangaReciente[] = producciones.slice(0, 4).map((p) => {
      const producto = p.productos_manga;
      const estado = normalizarEstado(p.estado_produccion);

      return {
        titulo: producto
          ? `${producto.titulo} Vol. ${producto.volumen}`
          : `Manga #${p.producto_id}`,
        cantidad: Number(p.cantidad_producida || 0),
        estado,
        linea: obtenerLetraLinea(p.linea_impresion),
      };
    });

    const lineaTiempo: Actividad[] = producciones.slice(0, 5).map((p) => {
      const producto = p.productos_manga;
      const estado = normalizarEstado(p.estado_produccion);

      const nombreProducto = producto
        ? `${producto.titulo} Vol. ${producto.volumen}`
        : `Manga #${p.producto_id}`;

      return {
        hora: formatearHora(p.created_at),
        accion:
          estado === "completado"
            ? "Producción completada"
            : estado === "en-proceso"
            ? "Producción en proceso"
            : "Producción registrada",
        detalle: `${nombreProducto} - ${Number(
          p.cantidad_producida || 0
        ).toLocaleString("es-MX")} unidades`,
        tipo: estado === "completado" ? "exito" : "info",
      };
    });

    const estadoInventario: EstadoInventario[] = materiales.slice(0, 5).map((m) => {
      const cantidad = Number(m.cantidad_disponible || 0);
      const minimo = Number(m.stock_minimo || 0);

      const nivel =
        minimo > 0 ? Math.min(100, Math.round((cantidad / (minimo * 3)) * 100)) : 100;

      const estado =
        cantidad <= minimo
          ? "critico"
          : cantidad <= minimo * 1.5
          ? "advertencia"
          : "bueno";

      return {
        item: m.nombre,
        nivel,
        estado,
      };
    });

    return {
      totalHoy,
      lineasActivas,
      completadosHoy,
      pendientesHoy,
      produccionHoyGrafica,
      mangasRecientes,
      lineaTiempo,
      estadoInventario,
    };
  }, [producciones, materiales]);

  return (
    <div className="space-y-6">
      {cargando ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-16 text-center text-slate-400">
            Cargando panel de usuario...
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Estadísticas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-500/30 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Producción Hoy
                  </CardTitle>
                  <BookOpen className="w-5 h-5 text-purple-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-100">
                    {datos.totalHoy.toLocaleString("es-MX")}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    unidades producidas
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border-cyan-500/30 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Líneas Activas
                  </CardTitle>
                  <Activity className="w-5 h-5 text-cyan-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-100">
                    {datos.lineasActivas}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    líneas con producción hoy
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Completados
                  </CardTitle>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-100">
                    {datos.completadosHoy}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    lotes finalizados hoy
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border-yellow-500/30 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">
                    Pendientes
                  </CardTitle>
                  <Clock className="w-5 h-5 text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-100">
                    {datos.pendientesHoy}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    lotes pendientes hoy
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Gráfico y recientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Progreso de Producción de Hoy
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Registros reales capturados hoy
                  </p>
                </CardHeader>
                <CardContent>
                  {datos.produccionHoyGrafica.length === 0 ? (
                    <div className="h-[280px] flex items-center justify-center text-slate-500">
                      No hay producción registrada hoy.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={datos.produccionHoyGrafica}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="hora" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1e293b",
                            border: "1px solid #334155",
                            borderRadius: "8px",
                            color: "#e2e8f0",
                          }}
                          labelStyle={{ color: "#e2e8f0" }}
                          itemStyle={{ color: "#e2e8f0" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="unidades"
                          stroke="#06b6d4"
                          strokeWidth={3}
                          dot={{ fill: "#06b6d4", r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Mangas Impresos Recientemente
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Últimos lotes registrados
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {datos.mangasRecientes.length === 0 ? (
                      <div className="py-10 text-center text-slate-500">
                        No hay lotes recientes.
                      </div>
                    ) : (
                      datos.mangasRecientes.map((manga, indice) => (
                        <div
                          key={indice}
                          className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-purple-500/30 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600/20 to-cyan-600/20 border border-purple-500/30 flex items-center justify-center">
                              <span className="text-sm font-bold text-purple-400">
                                {manga.linea}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-200">
                                {manga.titulo}
                              </p>
                              <p className="text-xs text-slate-500">
                                {manga.cantidad.toLocaleString("es-MX")} unidades
                              </p>
                            </div>
                          </div>

                          <Badge
                            variant="outline"
                            className={
                              manga.estado === "completado"
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : manga.estado === "en-proceso"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            }
                          >
                            {manga.estado === "completado"
                              ? "Completado"
                              : manga.estado === "en-proceso"
                              ? "En proceso"
                              : "Pendiente"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Línea de tiempo e inventario */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="lg:col-span-2">
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Línea de Tiempo de Actividad
                  </CardTitle>
                  <p className="text-sm text-slate-500">
                    Eventos recientes de producción reales
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {datos.lineaTiempo.length === 0 ? (
                      <div className="py-10 text-center text-slate-500">
                        No hay actividad reciente.
                      </div>
                    ) : (
                      datos.lineaTiempo.map((actividad, indice) => (
                        <div key={indice} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                actividad.tipo === "exito"
                                  ? "bg-green-500/20 border-2 border-green-500"
                                  : "bg-cyan-500/20 border-2 border-cyan-500"
                              }`}
                            >
                              {actividad.tipo === "exito" ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              ) : (
                                <Activity className="w-4 h-4 text-cyan-400" />
                              )}
                            </div>

                            {indice < datos.lineaTiempo.length - 1 && (
                              <div className="w-0.5 h-12 bg-slate-700 mt-1" />
                            )}
                          </div>

                          <div className="flex-1 pb-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-slate-200">
                                {actividad.accion}
                              </p>
                              <span className="text-xs text-slate-500">
                                {actividad.hora}
                              </span>
                            </div>

                            <p className="text-xs text-slate-500">
                              {actividad.detalle}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    <CardTitle className="text-slate-100">
                      Estado del Inventario
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {datos.estadoInventario.length === 0 ? (
                    <div className="py-10 text-center text-slate-500">
                      No hay materiales registrados.
                    </div>
                  ) : (
                    datos.estadoInventario.map((item, indice) => (
                      <div key={indice}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">
                            {item.item}
                          </span>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">
                              {item.nivel}%
                            </span>

                            {(item.estado === "advertencia" ||
                              item.estado === "critico") && (
                              <AlertCircle
                                className={`w-4 h-4 ${
                                  item.estado === "critico"
                                    ? "text-red-500"
                                    : "text-yellow-500"
                                }`}
                              />
                            )}
                          </div>
                        </div>

                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.estado === "critico"
                                ? "bg-red-500"
                                : item.estado === "advertencia"
                                ? "bg-yellow-500"
                                : "bg-gradient-to-r from-purple-600 to-cyan-600"
                            }`}
                            style={{ width: `${item.nivel}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}