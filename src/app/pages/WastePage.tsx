import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Recycle,
  AlertTriangle,
  CalendarDays,
  Search,
  Factory,
  User,
  ImageIcon,
  TrendingDown,
  RefreshCcw,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface MermaRow {
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
    tipo_edicion: string;
  } | null;
}

interface KPIsMerma {
  totalMerma: number;
  mermaHoy: number;
  mermaMes: number;
  productosAfectados: number;
}

const MOTIVOS = ["Todos", "Impresión defectuosa", "Papel dañado", "Error de corte", "Empaque dañado", "Falla mecánica", "Otro"];
const LINEAS = ["Todas", "Línea A", "Línea B", "Línea C", "Línea D"];

// ─── Componente ───────────────────────────────────────────────────────────────
export function WastePage() {
  const [mermas, setMermas] = useState<MermaRow[]>([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState("");
  const [filtroLinea, setFiltroLinea] = useState("Todas");
  const [filtroMotivo, setFiltroMotivo] = useState("Todos");

  useEffect(() => {
    cargarMermas();
  }, []);

  const cargarMermas = async () => {
    setCargando(true);

    const { data, error } = await supabase
      .from("mermas_produccion")
      .select(`
        *,
        productos_manga (
          titulo,
          volumen,
          imagen_url,
          tipo_edicion
        )
      `)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error al cargar mermas:", error.message);
      setMermas([]);
    } else {
      setMermas(data || []);
    }

    setCargando(false);
  };

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo<KPIsMerma>(() => {
    const hoy = new Date().toISOString().split("T")[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0];

    return {
      totalMerma: mermas.reduce((s, m) => s + m.cantidad_merma, 0),
      mermaHoy: mermas.filter((m) => m.fecha === hoy).reduce((s, m) => s + m.cantidad_merma, 0),
      mermaMes: mermas.filter((m) => m.fecha >= inicioMes).reduce((s, m) => s + m.cantidad_merma, 0),
      productosAfectados: new Set(mermas.filter((m) => m.producto_id).map((m) => m.producto_id)).size,
    };
  }, [mermas]);

  // ─── Top producto con más merma ────────────────────────────────────────────
  const topProductos = useMemo(() => {
    const mapa: Record<string, { titulo: string; volumen: number; total: number; imagen: string | null }> = {};
    for (const m of mermas) {
      if (!m.producto_id || !m.productos_manga) continue;
      const key = String(m.producto_id);
      if (!mapa[key]) {
        mapa[key] = {
          titulo: m.productos_manga.titulo,
          volumen: m.productos_manga.volumen,
          total: 0,
          imagen: m.productos_manga.imagen_url,
        };
      }
      mapa[key].total += m.cantidad_merma;
    }
    return Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 3);
  }, [mermas]);

  const topLinea = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const m of mermas) {
      const l = m.linea_impresion || "Sin línea";
      mapa[l] = (mapa[l] || 0) + m.cantidad_merma;
    }
    const sorted = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { linea: sorted[0][0], total: sorted[0][1] } : null;
  }, [mermas]);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  const mermasFiltradas = useMemo(() => {
    return mermas.filter((m) => {
      const texto = busqueda.toLowerCase();
      const matchBusqueda =
        !busqueda ||
        m.productos_manga?.titulo?.toLowerCase().includes(texto) ||
        (m.operador || "").toLowerCase().includes(texto) ||
        (m.motivo || "").toLowerCase().includes(texto);

      const matchLinea = filtroLinea === "Todas" || m.linea_impresion === filtroLinea;
      const matchMotivo = filtroMotivo === "Todos" || m.motivo === filtroMotivo;
      const matchDesde = !filtroFechaDesde || m.fecha >= filtroFechaDesde;
      const matchHasta = !filtroFechaHasta || m.fecha <= filtroFechaHasta;

      return matchBusqueda && matchLinea && matchMotivo && matchDesde && matchHasta;
    });
  }, [mermas, busqueda, filtroLinea, filtroMotivo, filtroFechaDesde, filtroFechaHasta]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroFechaDesde("");
    setFiltroFechaHasta("");
    setFiltroLinea("Todas");
    setFiltroMotivo("Todos");
  };

  const motivoBadgeColor = (motivo: string | null) => {
    const map: Record<string, string> = {
      "Impresión defectuosa": "border-red-500/30 text-red-400 bg-red-500/10",
      "Papel dañado": "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
      "Error de corte": "border-orange-500/30 text-orange-400 bg-orange-500/10",
      "Empaque dañado": "border-blue-500/30 text-blue-400 bg-blue-500/10",
      "Falla mecánica": "border-purple-500/30 text-purple-400 bg-purple-500/10",
      Otro: "border-slate-500/30 text-slate-400 bg-slate-500/10",
    };
    return map[motivo || ""] || "border-slate-500/30 text-slate-400 bg-slate-500/10";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600/30 to-orange-600/30 border border-red-500/30 flex items-center justify-center">
            <Recycle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Mermas</h1>
            <p className="text-sm text-slate-500">Control y análisis de materiales desechados</p>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={cargarMermas}
          className="text-slate-400 hover:text-slate-100 border border-slate-700 hover:border-slate-600"
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Merma",
            value: kpis.totalMerma.toLocaleString("es-MX"),
            sub: "unidades acumuladas",
            icon: <TrendingDown className="w-5 h-5 text-red-400" />,
            delay: 0.1,
          },
          {
            label: "Merma de Hoy",
            value: kpis.mermaHoy.toLocaleString("es-MX"),
            sub: "unidades hoy",
            icon: <CalendarDays className="w-5 h-5 text-orange-400" />,
            delay: 0.15,
          },
          {
            label: "Merma del Mes",
            value: kpis.mermaMes.toLocaleString("es-MX"),
            sub: "unidades este mes",
            icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
            delay: 0.2,
          },
          {
            label: "Productos Afectados",
            value: kpis.productosAfectados.toLocaleString("es-MX"),
            sub: "títulos con merma",
            icon: <Recycle className="w-5 h-5 text-purple-400" />,
            delay: 0.25,
          },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: kpi.delay }}
          >
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{kpi.label}</CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-100">{kpi.value}</div>
                <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top productos */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 text-base">Productos con más merma</CardTitle>
            </CardHeader>
            <CardContent>
              {topProductos.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Sin datos disponibles</p>
              ) : (
                <div className="space-y-3">
                  {topProductos.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-14 rounded-lg bg-purple-500/20 border border-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {p.imagen ? (
                          <img src={p.imagen} alt={p.titulo} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {p.titulo} Vol. {p.volumen}
                        </p>
                        <p className="text-xs text-slate-500">{p.total.toLocaleString("es-MX")} unidades</p>
                      </div>
                      <div className="text-lg font-bold text-red-400">#{i + 1}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Línea con más merma */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="bg-slate-900/50 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-slate-100 text-base">Línea con más merma</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[calc(100%-5rem)]">
              {topLinea ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/30 flex items-center justify-center mx-auto mb-3">
                    <Factory className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-2xl font-bold text-slate-100">{topLinea.linea}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {topLinea.total.toLocaleString("es-MX")} unidades desechadas
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Sin datos de líneas</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filtros + Tabla */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-slate-100">Registro de Mermas</CardTitle>
              <p className="text-sm text-slate-500">
                {mermasFiltradas.length} registro{mermasFiltradas.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Buscar manga, operador, motivo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <Select value={filtroLinea} onValueChange={setFiltroLinea}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue placeholder="Línea" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {LINEAS.map((l) => (
                    <SelectItem key={l} value={l} className="text-slate-300 hover:text-slate-100">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroMotivo} onValueChange={setFiltroMotivo}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                  <SelectValue placeholder="Motivo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  {MOTIVOS.map((m) => (
                    <SelectItem key={m} value={m} className="text-slate-300 hover:text-slate-100">
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                onClick={limpiarFiltros}
                className="text-slate-400 hover:text-slate-100 border border-slate-700"
              >
                Limpiar
              </Button>
            </div>

            {/* Fecha desde / hasta */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Desde</label>
                <Input
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-300"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
                <Input
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-slate-300"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {cargando ? (
              <div className="text-center py-12 text-slate-400 animate-pulse">Cargando mermas...</div>
            ) : mermasFiltradas.length === 0 ? (
              <div className="text-center py-16">
                <Recycle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-400">No se encontraron mermas con los filtros aplicados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mermasFiltradas.map((merma, index) => (
                  <motion.div
                    key={merma.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-red-500/20 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Imagen manga */}
                      <div className="w-12 h-16 rounded-lg bg-purple-500/20 border border-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {merma.productos_manga?.imagen_url ? (
                          <img
                            src={merma.productos_manga.imagen_url}
                            alt={merma.productos_manga.titulo}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-purple-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <p className="font-semibold text-slate-100">
                              {merma.productos_manga
                                ? `${merma.productos_manga.titulo} Vol. ${merma.productos_manga.volumen}`
                                : "Sin manga"}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {merma.linea_impresion && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <Factory className="w-3 h-3" />
                                  {merma.linea_impresion}
                                </span>
                              )}
                              {merma.operador && (
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {merma.operador}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(merma.fecha + "T12:00:00").toLocaleDateString("es-MX", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            {merma.observaciones && (
                              <p className="text-xs text-slate-500 mt-1 italic">{merma.observaciones}</p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <span className="text-2xl font-bold text-red-400">
                                {merma.cantidad_merma.toLocaleString("es-MX")}
                              </span>
                              <span className="text-xs text-slate-500 ml-1">uds</span>
                            </div>
                            {merma.motivo && (
                              <Badge variant="outline" className={motivoBadgeColor(merma.motivo)}>
                                {merma.motivo}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
