import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { motion } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

import {
  BookOpen,
  FileText,
  Droplet,
  AlertTriangle,
  TrendingUp,
  Activity,
  Package,
  Recycle,
  Factory,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Produccion {
  id: number;
  fecha: string;
  producto_id: number | null;
  cantidad_producida: number;
  linea_impresion: string;
  estado_produccion: string;
  operador: string;
  turno: string | null;
  tiempo_estimado_horas: number | null;
  tiempo_real_horas: number | null;
  merma: number | null;
  motivo_merma: string | null;
  observaciones: string | null;
  created_at: string;
  productos_manga?: {
    titulo: string;
    volumen: number;
    imagen_url: string | null;
    tipo_edicion: string;
  } | null;
}

interface MaterialInventario {
  id: number;
  nombre: string;
  categoria: string;
  cantidad_disponible: number;
  unidad: string;
  stock_minimo: number;
  estado: string;
}

interface RecetaMaterial {
  id: number;
  producto_id: number;
  material_id: number;
  cantidad_por_unidad: number;
  materia_prima?: {
    nombre: string;
    categoria: string;
    unidad: string;
  } | null;
}

interface MermaProduccion {
  id: number;
  produccion_id: number | null;
  producto_id: number | null;
  cantidad_merma: number;
  motivo: string | null;
  linea_impresion: string | null;
  operador: string | null;
  fecha: string;
  observaciones: string | null;
  created_at: string;
  productos_manga?: {
    titulo: string;
    volumen: number;
    imagen_url: string | null;
  } | null;
}

interface ChartItem {
  nombre: string;
  valor: number;
  color?: string;
}

const COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#f59e0b", "#22c55e", "#ef4444"];

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-500"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("es-MX", {
    maximumFractionDigits: 2,
  });
}

function getTodayISO() {
  return new Date().toISOString().split("T")[0];
}

function getMonthStartISO() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}

function getLastNDays(count: number) {
  const days: string[] = [];
  const today = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    days.push(date.toISOString().split("T")[0]);
  }

  return days;
}

function getLastNMonths(count: number) {
  const months: { key: string; label: string }[] = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleDateString("es-MX", { month: "short" });
    months.push({ key, label });
  }

  return months;
}

function getRelativeTime(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
}

export function AdminDashboard() {
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [materiales, setMateriales] = useState<MaterialInventario[]>([]);
  const [recetas, setRecetas] = useState<RecetaMaterial[]>([]);
  const [mermas, setMermas] = useState<MermaProduccion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);

    const [produccionesRes, materialesRes, recetasRes, mermasRes] = await Promise.all([
      supabase
        .from("produccion")
        .select(`
          *,
          productos_manga (
            titulo,
            volumen,
            imagen_url,
            tipo_edicion
          )
        `)
        .order("created_at", { ascending: false }),

      supabase
        .from("materia_prima")
        .select("*")
        .order("id", { ascending: true }),

      supabase
        .from("producto_materiales")
        .select(`
          *,
          materia_prima (
            nombre,
            categoria,
            unidad
          )
        `),

      supabase
        .from("mermas_produccion")
        .select(`
          *,
          productos_manga (
            titulo,
            volumen,
            imagen_url
          )
        `)
        .order("created_at", { ascending: false }),
    ]);

    if (produccionesRes.error) {
      console.error("Error al cargar producción:", produccionesRes.error.message);
      setProducciones([]);
    } else {
      setProducciones(produccionesRes.data || []);
    }

    if (materialesRes.error) {
      console.error("Error al cargar inventario:", materialesRes.error.message);
      setMateriales([]);
    } else {
      setMateriales(materialesRes.data || []);
    }

    if (recetasRes.error) {
      console.error("Error al cargar recetas:", recetasRes.error.message);
      setRecetas([]);
    } else {
      setRecetas(recetasRes.data || []);
    }

    if (mermasRes.error) {
      console.error("Error al cargar mermas:", mermasRes.error.message);
      setMermas([]);
    } else {
      setMermas(mermasRes.data || []);
    }

    setCargando(false);
  };

  const dashboardData = useMemo(() => {
    const hoy = getTodayISO();
    const inicioMes = getMonthStartISO();

    const produccionesNoCanceladas = producciones.filter(
      (p) => p.estado_produccion !== "Cancelado"
    );

    const produccionesMes = produccionesNoCanceladas.filter((p) => p.fecha >= inicioMes);
    const produccionesHoy = produccionesNoCanceladas.filter((p) => p.fecha === hoy);

    const totalMangas = produccionesNoCanceladas.reduce(
      (sum, item) => sum + Number(item.cantidad_producida || 0),
      0
    );

    const mangasHoy = produccionesHoy.reduce(
      (sum, item) => sum + Number(item.cantidad_producida || 0),
      0
    );

    const mangasMes = produccionesMes.reduce(
      (sum, item) => sum + Number(item.cantidad_producida || 0),
      0
    );

    const mermasMes = mermas
      .filter((m) => m.fecha >= inicioMes)
      .reduce((sum, item) => sum + Number(item.cantidad_merma || 0), 0);

    const inventarioCritico = materiales.filter(
      (m) => Number(m.cantidad_disponible || 0) <= Number(m.stock_minimo || 0)
    );

    const produccionesConTiempo = produccionesNoCanceladas.filter(
      (p) =>
        Number(p.tiempo_estimado_horas || 0) > 0 &&
        Number(p.tiempo_real_horas || 0) > 0
    );

    const eficiencia =
      produccionesConTiempo.length > 0
        ? Math.round(
            (produccionesConTiempo.reduce((sum, p) => {
              const estimado = Number(p.tiempo_estimado_horas || 0);
              const real = Number(p.tiempo_real_horas || 0);
              return sum + Math.min(100, (estimado / real) * 100);
            }, 0) /
              produccionesConTiempo.length) *
              10
          ) / 10
        : 0;

    const consumoPorCategoria: Record<string, number> = {};

    produccionesMes.forEach((prod) => {
      const recetaProducto = recetas.filter((r) => r.producto_id === prod.producto_id);
      recetaProducto.forEach((receta) => {
        const categoria = receta.materia_prima?.categoria || "Sin categoría";
        const consumo =
          Number(receta.cantidad_por_unidad || 0) *
          Number(prod.cantidad_producida || 0);

        consumoPorCategoria[categoria] = (consumoPorCategoria[categoria] || 0) + consumo;
      });
    });

    const datosMateriales: ChartItem[] = Object.entries(consumoPorCategoria)
      .map(([nombre, valor], index) => ({
        nombre,
        valor: Math.round(valor * 100) / 100,
        color: COLORS[index % COLORS.length],
      }))
      .filter((item) => item.valor > 0);

    const produccionDiaria = getLastNDays(8).map((fechaISO) => {
      const totalDia = produccionesNoCanceladas
        .filter((p) => p.fecha === fechaISO)
        .reduce((sum, p) => sum + Number(p.cantidad_producida || 0), 0);

      const label = new Date(fechaISO + "T12:00:00").toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
      });

      return {
        fecha: label,
        produccion: totalDia,
      };
    });

    const tendenciasMensuales = getLastNMonths(5).map(({ key, label }) => {
      const totalMes = produccionesNoCanceladas
        .filter((p) => p.fecha.startsWith(key))
        .reduce((sum, p) => sum + Number(p.cantidad_producida || 0), 0);

      return {
        mes: label,
        mangas: totalMes,
      };
    });

    const produccionPorLinea = ["Línea A", "Línea B", "Línea C", "Línea D"].map((linea) => ({
      linea,
      cantidad: produccionesMes
        .filter((p) => p.linea_impresion === linea)
        .reduce((sum, p) => sum + Number(p.cantidad_producida || 0), 0),
    }));

    const mermasPorMotivoMap: Record<string, number> = {};
    mermas
      .filter((m) => m.fecha >= inicioMes)
      .forEach((m) => {
        const motivo = m.motivo || "Sin motivo";
        mermasPorMotivoMap[motivo] =
          (mermasPorMotivoMap[motivo] || 0) + Number(m.cantidad_merma || 0);
      });

    const mermasPorMotivo = Object.entries(mermasPorMotivoMap).map(
      ([motivo, cantidad], index) => ({
        motivo,
        cantidad,
        color: COLORS[index % COLORS.length],
      })
    );

    const actividadReciente = produccionesNoCanceladas.slice(0, 5);

    return {
      totalMangas,
      mangasHoy,
      mangasMes,
      mermasMes,
      inventarioCritico,
      eficiencia,
      datosMateriales,
      produccionDiaria,
      tendenciasMensuales,
      produccionPorLinea,
      mermasPorMotivo,
      actividadReciente,
    };
  }, [producciones, materiales, recetas, mermas]);

  const alertasInventario = dashboardData.inventarioCritico.slice(0, 5);

  return (
    <div className="space-y-6">
      {cargando && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-4 text-sm text-slate-400">
            Cargando información del panel principal...
          </CardContent>
        </Card>
      )}

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Total Mangas Producidos
              </CardTitle>
              <BookOpen className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">
                {formatNumber(dashboardData.totalMangas)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500">
                  {formatNumber(dashboardData.mangasMes)} este mes
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-cyan-500/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Producción de Hoy
              </CardTitle>
              <Factory className="w-5 h-5 text-cyan-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">
                {formatNumber(dashboardData.mangasHoy)}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                unidades registradas hoy
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-red-500/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Merma del Mes
              </CardTitle>
              <Recycle className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">
                {formatNumber(dashboardData.mermasMes)}
              </div>
              <div className="text-xs text-slate-500 mt-2">
                unidades reportadas
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm hover:border-green-500/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Eficiencia de Producción
              </CardTitle>
              <Activity className="w-5 h-5 text-green-500 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-100">
                {dashboardData.eficiencia > 0 ? `${dashboardData.eficiencia}%` : "—"}
              </div>
              <div className="mt-2">
                <ProgressBar value={dashboardData.eficiencia} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Métricas secundarias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Inventario crítico</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {dashboardData.inventarioCritico.length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Producciones activas</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">
                {
                  producciones.filter((p) =>
                    ["Pendiente", "En impresión", "Empaquetado"].includes(
                      p.estado_produccion
                    )
                  ).length
                }
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Finalizadas</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {
                  producciones.filter((p) => p.estado_produccion === "Finalizado")
                    .length
                }
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </CardContent>
        </Card>
      </div>

      {/* Gráficas - Producción y Tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Producción Diaria</CardTitle>
              <p className="text-sm text-slate-500">Últimos 8 días de producción</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboardData.produccionDiaria}>
                  <defs>
                    <linearGradient id="colorProduccion" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="fecha" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "10px",
                      color: "#e2e8f0",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="produccion"
                    stroke="#8b5cf6"
                    fill="url(#colorProduccion)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Tendencias Mensuales</CardTitle>
              <p className="text-sm text-slate-500">Producción de los últimos 5 meses</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.tendenciasMensuales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mes" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "10px",
                      color: "#e2e8f0",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Bar dataKey="mangas" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Producción por línea + consumo de materiales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Producción por Línea</CardTitle>
              <p className="text-sm text-slate-500">Producción del mes actual</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dashboardData.produccionPorLinea}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="linea" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "10px",
                      color: "#e2e8f0",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                    labelStyle={{ color: "#cbd5e1" }}
                  />
                  <Bar dataKey="cantidad" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Consumo de Materiales</CardTitle>
              <p className="text-sm text-slate-500">Estimado por recetas del mes</p>
            </CardHeader>
            <CardContent>
              {dashboardData.datosMateriales.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm text-center">
                  Sin datos de consumo. Registra producciones con recetas.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={dashboardData.datosMateriales}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="valor"
                      >
                        {dashboardData.datosMateriales.map((entrada, indice) => (
                          <Cell
                            key={`cell-${indice}`}
                            fill={entrada.color || COLORS[indice % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #334155",
                          borderRadius: "10px",
                          color: "#e2e8f0",
                        }}
                        itemStyle={{ color: "#e2e8f0" }}
                        labelStyle={{ color: "#cbd5e1" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {dashboardData.datosMateriales.map((item) => (
                      <div key={item.nombre} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm text-slate-400 truncate">
                          {item.nombre}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Mermas por Motivo</CardTitle>
              <p className="text-sm text-slate-500">Mes actual</p>
            </CardHeader>
            <CardContent>
              {dashboardData.mermasPorMotivo.length === 0 ? (
                <div className="h-[260px] flex items-center justify-center text-slate-500 text-sm text-center">
                  Sin mermas registradas este mes.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dashboardData.mermasPorMotivo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="motivo" stroke="#64748b" hide />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "10px",
                        color: "#e2e8f0",
                      }}
                      itemStyle={{ color: "#e2e8f0" }}
                      labelStyle={{ color: "#cbd5e1" }}
                    />
                    <Bar dataKey="cantidad" fill="#ef4444" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Insights + Actividad + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-slate-100">Actividad de Producción Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.actividadReciente.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    No hay producciones registradas.
                  </div>
                ) : (
                  dashboardData.actividadReciente.map((actividad) => (
                    <div
                      key={actividad.id}
                      className="flex items-center justify-between gap-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-purple-500/30 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {actividad.productos_manga
                            ? `${actividad.productos_manga.titulo} Vol. ${actividad.productos_manga.volumen}`
                            : `Producción #${actividad.id}`}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-slate-500">
                            {formatNumber(actividad.cantidad_producida)} unidades
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {actividad.linea_impresion}
                          </span>
                          <span className="text-xs text-slate-500">•</span>
                          <span className="text-xs text-slate-500">
                            {getRelativeTime(actividad.created_at)}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          actividad.estado_produccion === "Finalizado"
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : actividad.estado_produccion === "Cancelado"
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        }
                      >
                        {actividad.estado_produccion}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <CardTitle className="text-slate-100">Alertas de Inventario</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertasInventario.length === 0 ? (
                <div className="text-center py-10">
                  <Package className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    No hay inventario crítico.
                  </p>
                </div>
              ) : (
                alertasInventario.map((alerta) => {
                  const porcentaje =
                    Number(alerta.stock_minimo || 0) > 0
                      ? (Number(alerta.cantidad_disponible || 0) /
                          Number(alerta.stock_minimo || 1)) *
                        100
                      : 100;

                  return (
                    <div
                      key={alerta.id}
                      className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                    >
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <p className="text-sm font-medium text-slate-200">
                          {alerta.nombre}
                        </p>
                        <Badge
                          variant="outline"
                          className="border-red-500/50 text-red-400"
                        >
                          Crítico
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>
                            Actual: {formatNumber(alerta.cantidad_disponible)}{" "}
                            {alerta.unidad}
                          </span>
                          <span>
                            Mín: {formatNumber(alerta.stock_minimo)} {alerta.unidad}
                          </span>
                        </div>
                        <ProgressBar value={porcentaje} />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Panel de insights */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 border-purple-500/30 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <CardTitle className="text-slate-100">Insights Operativos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  Producción mensual
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Este mes se han producido {formatNumber(dashboardData.mangasMes)} unidades.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  Riesgo de inventario
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {dashboardData.inventarioCritico.length > 0
                    ? `${dashboardData.inventarioCritico.length} materiales están en nivel crítico.`
                    : "El inventario se encuentra por encima del stock mínimo."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-start gap-3">
              <Recycle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  Control de mermas
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Se registraron {formatNumber(dashboardData.mermasMes)} unidades de merma este mes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
