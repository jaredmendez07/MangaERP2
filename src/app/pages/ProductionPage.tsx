import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { motion, AnimatePresence } from "motion/react";
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
  Factory,
  Plus,
  Play,
  Package,
  CheckCircle2,
  XCircle,
  ImageIcon,
  CalendarDays,
  User,
  Clock,
  AlertTriangle,
  Recycle,
  Search,
  RefreshCcw,
  Layers,
  TrendingUp,
  Filter,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface MangaProducto {
  id: number;
  titulo: string;
  volumen: number;
  tipo_edicion: string;
  paginas: number;
  imagen_url: string | null;
  estado: string;
}

interface MaterialInventario {
  id: number;
  nombre: string;
  categoria: string;
  unidad: string;
  cantidad_disponible: number;
}

interface RecetaItem {
  material_id: number;
  cantidad_por_unidad: number;
}

interface MaterialRequerido {
  nombre: string;
  unidad: string;
  requerido: number;
  disponible: number;
  suficiente: boolean;
  faltante: number;
}

interface Produccion {
  id: number;
  fecha: string;
  producto_id: number;
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

// ─── Constantes ───────────────────────────────────────────────────────────────
const ESTADOS_ORDEN = ["Pendiente", "En impresión", "Encuadernado", "Empaquetado", "Finalizado", "Cancelado"];

const PROGRESO_ESTADO: Record<string, number> = {
  Pendiente: 10,
  "En impresión": 35,
  Encuadernado: 60,
  Empaquetado: 85,
  Finalizado: 100,
  Cancelado: 0,
};

const COLOR_ESTADO: Record<string, string> = {
  Pendiente: "border-slate-500/30 text-slate-400 bg-slate-500/10",
  "En impresión": "border-blue-500/30 text-blue-400 bg-blue-500/10",
  Encuadernado: "border-purple-500/30 text-purple-400 bg-purple-500/10",
  Empaquetado: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10",
  Finalizado: "border-green-500/30 text-green-400 bg-green-500/10",
  Cancelado: "border-red-500/30 text-red-400 bg-red-500/10",
};

const LINEAS = ["Línea A", "Línea B", "Línea C", "Línea D"];
const TURNOS = ["Matutino", "Vespertino", "Nocturno"];
const MOTIVOS_MERMA = [
  "Impresión defectuosa",
  "Papel dañado",
  "Error de corte",
  "Empaque dañado",
  "Falla mecánica",
  "Otro",
];

// ─── Componente ───────────────────────────────────────────────────────────────
export function ProductionPage() {
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [mangas, setMangas] = useState<MangaProducto[]>([]);
  const [materiales, setMateriales] = useState<MaterialInventario[]>([]);
  const [cargando, setCargando] = useState(true);

  // Modal nueva producción
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [recetaItems, setRecetaItems] = useState<RecetaItem[]>([]);
  const [materialesRequeridos, setMaterialesRequeridos] = useState<MaterialRequerido[]>([]);
  const [sinReceta, setSinReceta] = useState(false);

  const [formNuevo, setFormNuevo] = useState({
    producto_id: "",
    cantidad_producida: "",
    linea_impresion: "",
    operador: "",
    turno: "",
    fecha: new Date().toISOString().split("T")[0],
    tiempo_estimado_horas: "",
    observaciones: "",
  });

  // Modal finalizar
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [produccionFinalizando, setProduccionFinalizando] = useState<Produccion | null>(null);
  const [formFinalizar, setFormFinalizar] = useState({
    tiempo_real_horas: "",
    merma: "",
    motivo_merma: "",
    observaciones: "",
  });

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroLinea, setFiltroLinea] = useState("Todas");
  const [filtroTurno, setFiltroTurno] = useState("Todos");
  const [filtroFecha, setFiltroFecha] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  // Calcular materiales requeridos al cambiar manga o cantidad
  useEffect(() => {
    calcularMateriales();
  }, [formNuevo.producto_id, formNuevo.cantidad_producida, recetaItems, materiales]);

  const cargarDatos = async () => {
    setCargando(true);

    const [{ data: prod }, { data: mang }, { data: mats }] = await Promise.all([
      supabase
        .from("produccion")
        .select(`
          *,
          productos_manga (titulo, volumen, imagen_url, tipo_edicion)
        `)
        .order("created_at", { ascending: false }),
      supabase.from("productos_manga").select("*").eq("estado", "activo").order("titulo"),
      supabase.from("materia_prima").select("*"),
    ]);

    setProducciones(prod || []);
    setMangas(mang || []);
    setMateriales(mats || []);
    setCargando(false);
  };

  // ─── Receta ────────────────────────────────────────────────────────────────
  const obtenerReceta = async (productoId: number) => {
    const { data, error } = await supabase
      .from("producto_materiales")
      .select("material_id, cantidad_por_unidad")
      .eq("producto_id", productoId);

    if (error || !data || data.length === 0) {
      setRecetaItems([]);
      setSinReceta(true);
    } else {
      setRecetaItems(data);
      setSinReceta(false);
    }
  };

  const calcularMateriales = () => {
    if (!formNuevo.producto_id || !formNuevo.cantidad_producida) {
      setMaterialesRequeridos([]);
      return;
    }

    const cantidad = Number(formNuevo.cantidad_producida);
    if (!cantidad || cantidad <= 0 || recetaItems.length === 0) {
      setMaterialesRequeridos([]);
      return;
    }

    const resultado: MaterialRequerido[] = [];
    for (const item of recetaItems) {
      const mat = materiales.find((m) => m.id === item.material_id);
      if (!mat) continue;
      const requerido = item.cantidad_por_unidad * cantidad;
      const disponible = mat.cantidad_disponible;
      resultado.push({
        nombre: mat.nombre,
        unidad: mat.unidad,
        requerido,
        disponible,
        suficiente: disponible >= requerido,
        faltante: disponible >= requerido ? 0 : requerido - disponible,
      });
    }
    setMaterialesRequeridos(resultado);
  };

  const inventarioSuficiente = materialesRequeridos.length > 0 && materialesRequeridos.every((m) => m.suficiente);
  const hayMaterialesFaltantes = materialesRequeridos.some((m) => !m.suficiente);

  // ─── Guardar nueva producción ──────────────────────────────────────────────
  const guardarProduccion = async () => {
    const { producto_id, cantidad_producida, linea_impresion, operador, turno, fecha, tiempo_estimado_horas, observaciones } = formNuevo;

    if (!producto_id || !cantidad_producida || !linea_impresion || !operador || !fecha) {
      alert("Completa los campos obligatorios: manga, cantidad, línea, operador y fecha.");
      return;
    }

    if (sinReceta) {
      alert("Este manga no tiene receta configurada. Ve a Recetas y configura los materiales primero.");
      return;
    }

    if (hayMaterialesFaltantes) {
      alert("No hay suficiente inventario para producir esta cantidad.");
      return;
    }

    setGuardando(true);

    try {
      // Insertar producción
      const { data: nuevaProd, error: errProd } = await supabase
        .from("produccion")
        .insert([
          {
            producto_id: Number(producto_id),
            cantidad_producida: Number(cantidad_producida),
            linea_impresion,
            operador,
            turno: turno || null,
            fecha,
            tiempo_estimado_horas: tiempo_estimado_horas ? Number(tiempo_estimado_horas) : null,
            observaciones: observaciones || null,
            estado_produccion: "Pendiente",
          },
        ])
        .select()
        .single();

      if (errProd || !nuevaProd) {
        throw new Error(errProd?.message || "Error al crear producción");
      }

      // Descontar materiales
      for (const item of recetaItems) {
        const mat = materiales.find((m) => m.id === item.material_id);
        if (!mat) continue;
        const nuevaCantidad = mat.cantidad_disponible - item.cantidad_por_unidad * Number(cantidad_producida);
        await supabase
          .from("materia_prima")
          .update({ cantidad_disponible: Math.max(0, nuevaCantidad) })
          .eq("id", item.material_id);
      }

      setModalNuevo(false);
      resetFormNuevo();
      await cargarDatos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`No se pudo registrar la producción: ${msg}`);
    }

    setGuardando(false);
  };

  const resetFormNuevo = () => {
    setFormNuevo({
      producto_id: "",
      cantidad_producida: "",
      linea_impresion: "",
      operador: "",
      turno: "",
      fecha: new Date().toISOString().split("T")[0],
      tiempo_estimado_horas: "",
      observaciones: "",
    });
    setRecetaItems([]);
    setMaterialesRequeridos([]);
    setSinReceta(false);
  };

  // ─── Transiciones de estado ────────────────────────────────────────────────
  const siguienteEstado = (estado: string): string | null => {
    switch (estado) {
      case "Pendiente":
        return "En impresión";
      case "En impresión":
        return "Encuadernado";
      case "Encuadernado":
        return "Empaquetado";
      case "Empaquetado":
        return "Finalizado";
      default:
        return null;
    }
  };

  const avanzarEstado = async (prod: Produccion) => {
    const siguiente = siguienteEstado(prod.estado_produccion);
    if (!siguiente) return;

    if (siguiente === "Finalizado") {
      // Abrir modal de finalización
      setProduccionFinalizando(prod);
      setFormFinalizar({ tiempo_real_horas: "", merma: "", motivo_merma: "", observaciones: "" });
      setModalFinalizar(true);
      return;
    }

    await supabase
      .from("produccion")
      .update({ estado_produccion: siguiente })
      .eq("id", prod.id);

    await cargarDatos();
  };

  const cancelarProduccion = async (id: number) => {
    if (!confirm("¿Cancelar esta producción?")) return;
    await supabase.from("produccion").update({ estado_produccion: "Cancelado" }).eq("id", id);
    await cargarDatos();
  };

  // ─── Finalizar producción ──────────────────────────────────────────────────
  const finalizarProduccion = async () => {
    if (!produccionFinalizando) return;

    const mermaNum = Number(formFinalizar.merma) || 0;
    const tiempoReal = formFinalizar.tiempo_real_horas
      ? Number(formFinalizar.tiempo_real_horas)
      : null;

    setGuardando(true);

    try {
      // Actualizar producción
      const { error: updateError } = await supabase
        .from("produccion")
        .update({
          estado_produccion: "Finalizado",
          tiempo_real_horas: tiempoReal,
          merma: mermaNum,
          motivo_merma: formFinalizar.motivo_merma || null,
          observaciones: formFinalizar.observaciones || null,
        })
        .eq("id", produccionFinalizando.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Registrar merma si aplica
      if (mermaNum > 0) {
        const { error: mermaError } = await supabase
          .from("mermas_produccion")
          .insert([
            {
              produccion_id: produccionFinalizando.id,
              producto_id: produccionFinalizando.producto_id,
              cantidad_merma: mermaNum,
              motivo: formFinalizar.motivo_merma || "Sin motivo especificado",
              linea_impresion: produccionFinalizando.linea_impresion,
              operador: produccionFinalizando.operador,
              fecha: produccionFinalizando.fecha,
              observaciones: formFinalizar.observaciones || null,
            },
          ]);

        if (mermaError) {
          throw new Error(
            `Producción finalizada, pero no se registró la merma: ${mermaError.message}`
          );
        }
      }

      setModalFinalizar(false);
      setProduccionFinalizando(null);
      setFormFinalizar({
        tiempo_real_horas: "",
        merma: "",
        motivo_merma: "",
        observaciones: "",
      });

      await cargarDatos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      alert(`Error al finalizar: ${msg}`);
    }

    setGuardando(false);
  };

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const conTiempo = producciones.filter(
      (p) => p.tiempo_estimado_horas && p.tiempo_real_horas && p.tiempo_real_horas > 0
    );
    const eficiencia =
      conTiempo.length > 0
        ? Math.round(
            (conTiempo.reduce(
              (s, p) => s + Math.min(100, (p.tiempo_estimado_horas! / p.tiempo_real_horas!) * 100),
              0
            ) /
              conTiempo.length) *
              10
          ) / 10
        : null;

    return {
      total: producciones.length,
      hoy: producciones.filter((p) => p.fecha === hoy).reduce((s, p) => s + p.cantidad_producida, 0),
      mes: producciones
        .filter((p) => p.fecha >= inicioMes)
        .reduce((s, p) => s + p.cantidad_producida, 0),
      pendientes: producciones.filter((p) => p.estado_produccion === "Pendiente").length,
      enImpresion: producciones.filter((p) => p.estado_produccion === "En impresión").length,
      encuadernado: producciones.filter((p) => p.estado_produccion === "Encuadernado").length,
      empaquetado: producciones.filter((p) => p.estado_produccion === "Empaquetado").length,
      finalizados: producciones.filter((p) => p.estado_produccion === "Finalizado").length,
      mermaMes: producciones
        .filter((p) => p.fecha >= inicioMes && p.merma)
        .reduce((s, p) => s + (p.merma || 0), 0),
      eficiencia,
    };
  }, [producciones]);

  // ─── Filtros ───────────────────────────────────────────────────────────────
  const produccionesFiltradas = useMemo(() => {
    return producciones.filter((p) => {
      const pm = p.productos_manga;
      const texto = busqueda.toLowerCase();
      const matchBusqueda =
        !busqueda ||
        (pm?.titulo || "").toLowerCase().includes(texto) ||
        (p.operador || "").toLowerCase().includes(texto);
      const matchEstado = filtroEstado === "Todos" || p.estado_produccion === filtroEstado;
      const matchLinea = filtroLinea === "Todas" || p.linea_impresion === filtroLinea;
      const matchTurno = filtroTurno === "Todos" || p.turno === filtroTurno;
      const matchFecha = !filtroFecha || p.fecha === filtroFecha;

      return matchBusqueda && matchEstado && matchLinea && matchTurno && matchFecha;
    });
  }, [producciones, busqueda, filtroEstado, filtroLinea, filtroTurno, filtroFecha]);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("Todos");
    setFiltroLinea("Todas");
    setFiltroTurno("Todos");
    setFiltroFecha("");
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600/30 to-cyan-600/30 border border-purple-500/30 flex items-center justify-center">
            <Factory className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Producción</h1>
            <p className="text-sm text-slate-500">Control de lotes y flujo de impresión</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={cargarDatos}
            className="text-slate-400 hover:text-slate-100 border border-slate-700 hover:border-slate-600"
          >
            <RefreshCcw className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setModalNuevo(true)}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Producción
          </Button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Lotes", value: kpis.total, color: "text-slate-100" },
          { label: "Hoy", value: kpis.hoy.toLocaleString("es-MX"), color: "text-cyan-400" },
          { label: "Este mes", value: kpis.mes.toLocaleString("es-MX"), color: "text-purple-400" },
          { label: "Pendientes", value: kpis.pendientes, color: "text-slate-400" },
          { label: "Impresión", value: kpis.enImpresion, color: "text-blue-400" },
          { label: "Encuadernado", value: kpis.encuadernado, color: "text-purple-400" },
          { label: "Empaquetado", value: kpis.empaquetado, color: "text-yellow-400" },
          { label: "Finalizados", value: kpis.finalizados, color: "text-green-400" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="pt-4 pb-3 px-3">
                <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filtros */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar manga u operador..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="Todos" className="text-slate-300">Todos los estados</SelectItem>
                {ESTADOS_ORDEN.map((e) => (
                  <SelectItem key={e} value={e} className="text-slate-300">{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroLinea} onValueChange={setFiltroLinea}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                <SelectValue placeholder="Línea" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="Todas" className="text-slate-300">Todas las líneas</SelectItem>
                {LINEAS.map((l) => (
                  <SelectItem key={l} value={l} className="text-slate-300">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroTurno} onValueChange={setFiltroTurno}>
              <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                <SelectValue placeholder="Turno" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="Todos" className="text-slate-300">Todos los turnos</SelectItem>
                {TURNOS.map((t) => (
                  <SelectItem key={t} value={t} className="text-slate-300">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-300 flex-1"
              />
              <Button
                variant="ghost"
                onClick={limpiarFiltros}
                className="border border-slate-700 text-slate-400 hover:text-slate-100 shrink-0"
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de producciones */}
      <div className="space-y-3">
        {cargando ? (
          <div className="text-center py-16 text-slate-400 animate-pulse">Cargando producciones...</div>
        ) : produccionesFiltradas.length === 0 ? (
          <div className="text-center py-16">
            <Factory className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No se encontraron producciones.</p>
          </div>
        ) : (
          produccionesFiltradas.map((prod, index) => {
            const pm = prod.productos_manga;
            const progreso = PROGRESO_ESTADO[prod.estado_produccion] ?? 0;
            const siguiente = siguienteEstado(prod.estado_produccion);
            const cancelable = !["Finalizado", "Cancelado"].includes(prod.estado_produccion);

            return (
              <motion.div
                key={prod.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="bg-slate-900/50 border-slate-800 hover:border-purple-500/20 transition-all">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {/* Imagen */}
                      <div className="w-14 h-20 rounded-lg bg-purple-500/20 border border-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {pm?.imagen_url ? (
                          <img
                            src={pm.imagen_url}
                            alt={pm.titulo}
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-100">
                                {pm ? `${pm.titulo} Vol. ${pm.volumen}` : `Producción #${prod.id}`}
                              </h3>
                              <Badge variant="outline" className={COLOR_ESTADO[prod.estado_produccion]}>
                                {prod.estado_produccion}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" />
                                {prod.cantidad_producida.toLocaleString("es-MX")} uds
                              </span>
                              <span className="flex items-center gap-1">
                                <Factory className="w-3 h-3" />
                                {prod.linea_impresion}
                              </span>
                              {prod.turno && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {prod.turno}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {prod.operador}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {new Date(prod.fecha + "T12:00:00").toLocaleDateString("es-MX", {
                                  day: "numeric", month: "short", year: "numeric"
                                })}
                              </span>
                            </div>

                            {/* Tiempo + Merma */}
                            <div className="flex items-center gap-4 mt-1 text-xs flex-wrap">
                              {prod.tiempo_estimado_horas && (
                                <span className="text-slate-500">
                                  Est: {prod.tiempo_estimado_horas}h
                                </span>
                              )}
                              {prod.tiempo_real_horas && (
                                <span className="text-cyan-500">
                                  Real: {prod.tiempo_real_horas}h
                                </span>
                              )}
                              {prod.merma !== null && prod.merma !== undefined && prod.merma > 0 && (
                                <span className="text-red-400 flex items-center gap-1">
                                  <Recycle className="w-3 h-3" />
                                  Merma: {prod.merma} uds
                                  {prod.motivo_merma && ` · ${prod.motivo_merma}`}
                                </span>
                              )}
                            </div>

                            {prod.observaciones && (
                              <p className="text-xs text-slate-500 italic mt-1">{prod.observaciones}</p>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 shrink-0">
                            {siguiente && (
                              <Button
                                size="sm"
                                onClick={() => avanzarEstado(prod)}
                                className={
                                  siguiente === "Finalizado"
                                    ? "bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 text-xs"
                                    : siguiente === "Empaquetado"
                                    ? "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/30 text-xs"
                                    : siguiente === "Encuadernado"
                                    ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 text-xs"
                                    : "bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-xs"
                                }
                              >
                                {siguiente === "En impresión" && <Play className="w-3 h-3 mr-1" />}
                                {siguiente === "Encuadernado" && <Layers className="w-3 h-3 mr-1" />}
                                {siguiente === "Empaquetado" && <Package className="w-3 h-3 mr-1" />}
                                {siguiente === "Finalizado" && <CheckCircle2 className="w-3 h-3 mr-1" />}

                                {siguiente === "En impresión"
                                  ? "Iniciar impresión"
                                  : siguiente === "Encuadernado"
                                  ? "Encuadernar"
                                  : siguiente === "Empaquetado"
                                  ? "Empaquetar"
                                  : siguiente === "Finalizado"
                                  ? "Finalizar"
                                  : siguiente}
                              </Button>
                            )}
                            {cancelable && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelarProduccion(prod.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs border border-red-500/20"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        {prod.estado_produccion !== "Cancelado" && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500">Progreso</span>
                              <span className="text-xs text-slate-400">{progreso}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progreso}%` }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ─── Modal: Nueva Producción ──────────────────────────────────────────── */}
      <AnimatePresence>
        {modalNuevo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-bold text-slate-100">Nueva Producción</h2>
                <p className="text-sm text-slate-500 mt-1">Registra un nuevo lote de impresión</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Manga */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Manga <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formNuevo.producto_id}
                      onValueChange={(val) => {
                        setFormNuevo((p) => ({ ...p, producto_id: val }));
                        obtenerReceta(Number(val));
                      }}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                        <SelectValue placeholder="Selecciona un manga" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700 max-h-48">
                        {mangas.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)} className="text-slate-300">
                            {m.titulo} Vol. {m.volumen}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Cantidad producida <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Ej: 500"
                      value={formNuevo.cantidad_producida}
                      onChange={(e) => setFormNuevo((p) => ({ ...p, cantidad_producida: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                  </div>
                </div>

                {/* Alerta sin receta */}
                {sinReceta && formNuevo.producto_id && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                    <p className="text-sm text-yellow-300">
                      Este manga no tiene receta configurada. Configúrala en <strong>Recetas</strong> antes de producirlo.
                    </p>
                  </div>
                )}

                {/* Resumen de materiales */}
                {materialesRequeridos.length > 0 && (
                  <div className="rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-800/60 text-xs font-medium text-slate-400 grid grid-cols-4 gap-2">
                      <span>Material</span>
                      <span>Requerido</span>
                      <span>Disponible</span>
                      <span>Estado</span>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {materialesRequeridos.map((mat) => (
                        <div key={mat.nombre} className="px-4 py-2.5 grid grid-cols-4 gap-2 text-sm">
                          <span className="text-slate-300">{mat.nombre}</span>
                          <span className="text-slate-400">
                            {mat.requerido.toLocaleString("es-MX")} {mat.unidad}
                          </span>
                          <span className="text-slate-400">
                            {mat.disponible.toLocaleString("es-MX")} {mat.unidad}
                          </span>
                          {mat.suficiente ? (
                            <span className="text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Falta {mat.faltante.toLocaleString("es-MX")} {mat.unidad}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {hayMaterialesFaltantes && (
                      <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/30">
                        <p className="text-xs text-red-400">
                          Inventario insuficiente — no es posible registrar esta producción.
                        </p>
                      </div>
                    )}
                    {inventarioSuficiente && (
                      <div className="px-4 py-2 bg-green-500/10 border-t border-green-500/30">
                        <p className="text-xs text-green-400">Inventario suficiente ✓</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Campos adicionales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Línea de impresión <span className="text-red-400">*</span>
                    </Label>
                    <Select
                      value={formNuevo.linea_impresion}
                      onValueChange={(val) => setFormNuevo((p) => ({ ...p, linea_impresion: val }))}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                        <SelectValue placeholder="Selecciona línea" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {LINEAS.map((l) => (
                          <SelectItem key={l} value={l} className="text-slate-300">{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Turno</Label>
                    <Select
                      value={formNuevo.turno}
                      onValueChange={(val) => setFormNuevo((p) => ({ ...p, turno: val }))}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                        <SelectValue placeholder="Selecciona turno" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {TURNOS.map((t) => (
                          <SelectItem key={t} value={t} className="text-slate-300">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Operador <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      placeholder="Nombre del operador"
                      value={formNuevo.operador}
                      onChange={(e) => setFormNuevo((p) => ({ ...p, operador: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">
                      Fecha de producción <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formNuevo.fecha}
                      onChange={(e) => setFormNuevo((p) => ({ ...p, fecha: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Tiempo estimado (horas)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="Ej: 4"
                      value={formNuevo.tiempo_estimado_horas}
                      onChange={(e) => setFormNuevo((p) => ({ ...p, tiempo_estimado_horas: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Observaciones</Label>
                    <Input
                      placeholder="Notas adicionales..."
                      value={formNuevo.observaciones}
                      onChange={(e) => setFormNuevo((p) => ({ ...p, observaciones: e.target.value }))}
                      className="bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => { setModalNuevo(false); resetFormNuevo(); }}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={guardarProduccion}
                  disabled={
                    guardando ||
                    sinReceta ||
                    hayMaterialesFaltantes ||
                    (materialesRequeridos.length === 0 && !!formNuevo.producto_id && !!formNuevo.cantidad_producida)
                  }
                  className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:opacity-50"
                >
                  {guardando ? "Registrando..." : "Registrar producción"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Modal: Finalizar producción ──────────────────────────────────────── */}
      <AnimatePresence>
        {modalFinalizar && produccionFinalizando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h2 className="text-xl font-bold text-slate-100">Finalizar producción</h2>
                </div>
                <p className="text-sm text-slate-500">
                  {produccionFinalizando.productos_manga
                    ? `${produccionFinalizando.productos_manga.titulo} Vol. ${produccionFinalizando.productos_manga.volumen}`
                    : `Producción #${produccionFinalizando.id}`}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Tiempo real en horas</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    placeholder="Ej: 3.5"
                    value={formFinalizar.tiempo_real_horas}
                    onChange={(e) => setFormFinalizar((p) => ({ ...p, tiempo_real_horas: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300">Merma generada (unidades)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0 si no hubo merma"
                    value={formFinalizar.merma}
                    onChange={(e) => setFormFinalizar((p) => ({ ...p, merma: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>

                {Number(formFinalizar.merma) > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Motivo de merma</Label>
                    <Select
                      value={formFinalizar.motivo_merma}
                      onValueChange={(val) => setFormFinalizar((p) => ({ ...p, motivo_merma: val }))}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-300">
                        <SelectValue placeholder="Selecciona motivo" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-700">
                        {MOTIVOS_MERMA.map((m) => (
                          <SelectItem key={m} value={m} className="text-slate-300">{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-slate-300">Observaciones finales</Label>
                  <Input
                    placeholder="Notas del cierre de producción..."
                    value={formFinalizar.observaciones}
                    onChange={(e) => setFormFinalizar((p) => ({ ...p, observaciones: e.target.value }))}
                    className="bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => { setModalFinalizar(false); setProduccionFinalizando(null); }}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={finalizarProduccion}
                  disabled={guardando}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {guardando ? "Guardando..." : "Finalizar"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
