import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Filter,
} from "lucide-react";

interface ProductoMangaJoin {
  id: number;
  titulo: string;
  volumen: number;
  tipo_edicion: string;
  imagen_url: string | null;
  precio_venta: number | null;
}

interface ProduccionDB {
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
  productos_manga?: ProductoMangaJoin | null;
}

interface MermaDB {
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

interface RecetaDB {
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

interface TendenciaMensual {
  mes: string;
  produccion: number;
  ingresos: number;
  eficiencia: number;
}

interface SerieManga {
  nombre: string;
  unidades: number;
  ingresos: number;
  tendencia: number;
}

interface ProductividadLinea {
  fecha: string;
  [linea: string]: string | number;
}

interface ConsumoMaterialCategoria {
  material: string;
  consumo: number;
  porcentaje: number;
}

const normalizarLinea = (linea?: string | null) => {
  const valor = (linea || "Sin línea")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (valor.match(/\b(a|linea a|línea a)\b/) || valor.endsWith(" a")) {
    return "Línea A";
  }

  if (valor.match(/\b(b|linea b|línea b)\b/) || valor.endsWith(" b")) {
    return "Línea B";
  }

  if (valor.match(/\b(c|linea c|línea c)\b/) || valor.endsWith(" c")) {
    return "Línea C";
  }

  if (valor.match(/\b(d|linea d|línea d)\b/) || valor.endsWith(" d")) {
    return "Línea D";
  }

  return linea?.trim() || "Sin línea";
};

const tooltipOscuro = {
  contentStyle: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "10px",
    color: "#e2e8f0",
  },
  itemStyle: { color: "#e2e8f0" },
  labelStyle: { color: "#cbd5e1" },
};

const coloresLineas = [
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

const nombreMes = (fecha: Date) => {
  return fecha
    .toLocaleDateString("es-MX", { month: "short" })
    .replace(".", "");
};

const formatoFechaCorta = (fechaISO: string) => {
  return new Date(`${fechaISO}T12:00:00`)
    .toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
    })
    .replace(".", "");
};

const fechaISODesdeDate = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const inicioDeMes = (fecha: Date) => {
  return fechaISODesdeDate(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
};

const finDeMes = (fecha: Date) => {
  return fechaISODesdeDate(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0));
};

const calcularEficienciaProduccion = (producciones: ProduccionDB[]) => {
  const conTiempo = producciones.filter(
    (p) =>
      Number(p.tiempo_estimado_horas) > 0 &&
      Number(p.tiempo_real_horas) > 0
  );

  if (conTiempo.length === 0) return 0;

  const promedio =
    conTiempo.reduce((total, p) => {
      const estimado = Number(p.tiempo_estimado_horas);
      const real = Number(p.tiempo_real_horas);
      return total + Math.min(100, (estimado / real) * 100);
    }, 0) / conTiempo.length;

  return Math.round(promedio * 10) / 10;
};

const calcularCalidad = (produccionTotal: number, mermaTotal: number) => {
  if (produccionTotal <= 0) return 0;

  return Math.max(
    0,
    Math.round(((produccionTotal - mermaTotal) / produccionTotal) * 1000) / 10
  );
};

export function AnalyticsPage() {
  const [producciones, setProducciones] = useState<ProduccionDB[]>([]);
  const [mermas, setMermas] = useState<MermaDB[]>([]);
  const [materiales, setMateriales] = useState<MaterialDB[]>([]);
  const [recetas, setRecetas] = useState<RecetaDB[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);

    const [produccionRes, mermasRes, materialesRes, recetasRes] =
      await Promise.all([
        supabase
          .from("produccion")
          .select(`
            *,
            productos_manga (
              id,
              titulo,
              volumen,
              tipo_edicion,
              imagen_url,
              precio_venta
            )
          `)
          .order("fecha", { ascending: true }),
        supabase
          .from("mermas_produccion")
          .select("*")
          .order("fecha", { ascending: true }),
        supabase.from("materia_prima").select("*"),
        supabase
          .from("producto_materiales")
          .select("*"),
      ]);

    if (produccionRes.error)
      console.error("Error cargando producción:", produccionRes.error.message);

    if (mermasRes.error)
      console.error("Error cargando mermas:", mermasRes.error.message);

    if (materialesRes.error)
      console.error("Error cargando materiales:", materialesRes.error.message);

    if (recetasRes.error)
      console.error("Error cargando recetas:", recetasRes.error.message);

    setProducciones((produccionRes.data || []) as ProduccionDB[]);
    setMermas((mermasRes.data || []) as MermaDB[]);
    setMateriales((materialesRes.data || []) as MaterialDB[]);
    setRecetas((recetasRes.data || []) as RecetaDB[]);

    setCargando(false);
  };

  const datosCalculados = useMemo(() => {
    const produccionesValidas = producciones.filter(
      (p) => p.estado_produccion !== "Cancelado"
    );

    const ultimaFechaRegistrada = produccionesValidas
      .map((p) => p.fecha)
      .filter(Boolean)
      .sort()
      .at(-1);

    const hoy = ultimaFechaRegistrada
      ? new Date(`${ultimaFechaRegistrada}T12:00:00`)
      : new Date();

    const inicioMesActual = inicioDeMes(hoy);
    const finMesActual = finDeMes(hoy);
    const inicioAnio = fechaISODesdeDate(
      new Date(hoy.getFullYear(), 0, 1)
    );

    const produccionesFinalizadas = produccionesValidas.filter(
      (p) => p.estado_produccion === "Finalizado"
    );

    const produccionesAnio = produccionesValidas.filter(
      (p) => p.fecha >= inicioAnio
    );

    const produccionesMes = produccionesValidas.filter(
      (p) => p.fecha >= inicioMesActual && p.fecha <= finMesActual
    );

    const mermasMes = mermas.filter(
      (m) => m.fecha >= inicioMesActual && m.fecha <= finMesActual
    );

    const produccionTotal = produccionesAnio.reduce(
      (sum, p) => sum + Number(p.cantidad_producida || 0),
      0
    );

    const produccionMes = produccionesMes.reduce(
      (sum, p) => sum + Number(p.cantidad_producida || 0),
      0
    );

    const mermaTotal = mermasMes.reduce(
      (sum, m) => sum + Number(m.cantidad_merma || 0),
      0
    );

    const ingresosAnio = produccionesAnio.reduce((sum, p) => {
      const precio = Number(p.productos_manga?.precio_venta || 0);
      return sum + Number(p.cantidad_producida || 0) * precio;
    }, 0);

    const eficienciaPromedio =
      calcularEficienciaProduccion(produccionesFinalizadas);

    const tasaCalidad = calcularCalidad(produccionMes, mermaTotal);

    const meses: TendenciaMensual[] = [];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const inicio = inicioDeMes(fecha);
      const fin = finDeMes(fecha);

      const produccionesDelMes = produccionesValidas.filter(
        (p) => p.fecha >= inicio && p.fecha <= fin
      );

      const finalizadasDelMes = produccionesDelMes.filter(
        (p) => p.estado_produccion === "Finalizado"
      );

      const produccion = produccionesDelMes.reduce(
        (sum, p) => sum + Number(p.cantidad_producida || 0),
        0
      );

      const ingresos = produccionesDelMes.reduce((sum, p) => {
        const precio = Number(p.productos_manga?.precio_venta || 0);
        return sum + Number(p.cantidad_producida || 0) * precio;
      }, 0);

      meses.push({
        mes: nombreMes(fecha),
        produccion,
        ingresos,
        eficiencia: calcularEficienciaProduccion(finalizadasDelMes),
      });
    }

    const produccionMesAnterior =
      meses.length >= 2 ? meses[meses.length - 2].produccion : 0;

    const ingresosMesAnterior =
      meses.length >= 2 ? meses[meses.length - 2].ingresos : 0;

    const tendenciaProduccion =
      produccionMesAnterior > 0
        ? ((produccionMes - produccionMesAnterior) / produccionMesAnterior) *
          100
        : 0;

    const ingresosMes = meses[meses.length - 1]?.ingresos || 0;

    const tendenciaIngresos =
      ingresosMesAnterior > 0
        ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100
        : 0;

    const porSerie = new Map<
      string,
      { unidades: number; ingresos: number; actual: number; anterior: number }
    >();

    const mesAnteriorFecha = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - 1,
      1
    );

    const inicioMesAnterior = inicioDeMes(mesAnteriorFecha);
    const finMesAnterior = finDeMes(mesAnteriorFecha);

    produccionesValidas.forEach((p) => {
      const nombre = p.productos_manga?.titulo || `Manga #${p.producto_id}`;
      const precio = Number(p.productos_manga?.precio_venta || 0);

      const actual = porSerie.get(nombre) || {
        unidades: 0,
        ingresos: 0,
        actual: 0,
        anterior: 0,
      };

      const cantidad = Number(p.cantidad_producida || 0);

      actual.unidades += cantidad;
      actual.ingresos += cantidad * precio;

      if (p.fecha >= inicioMesActual && p.fecha <= finMesActual) {
        actual.actual += cantidad;
      }

      if (p.fecha >= inicioMesAnterior && p.fecha <= finMesAnterior) {
        actual.anterior += cantidad;
      }

      porSerie.set(nombre, actual);
    });

    const seriesManga: SerieManga[] = Array.from(porSerie.entries())
      .map(([nombre, data]) => ({
        nombre,
        unidades: data.unidades,
        ingresos: data.ingresos,
        tendencia:
          data.anterior > 0
            ? Math.round(((data.actual - data.anterior) / data.anterior) * 100)
            : data.actual > 0
            ? 100
            : 0,
      }))
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 6);

    const lineas = Array.from(
      new Set(
        produccionesValidas.map((p) => normalizarLinea(p.linea_impresion))
      )
    ).slice(0, 5);

    const dias: ProductividadLinea[] = [];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - i);

      const iso = fechaISODesdeDate(fecha);

      const item: ProductividadLinea = {
        fecha: formatoFechaCorta(iso),
      };

      lineas.forEach((linea) => {
        item[linea] = produccionesValidas
          .filter(
            (p) =>
              p.fecha === iso && normalizarLinea(p.linea_impresion) === linea
          )
          .reduce((sum, p) => sum + Number(p.cantidad_producida || 0), 0);
      });

      dias.push(item);
    }

    const consumoPorCategoria = new Map<string, number>();

    const materialesPorId = new Map(
      materiales.map((material) => [Number(material.id), material])
    );

    produccionesMes.forEach((produccion) => {
      const recetaProducto = recetas.filter(
        (receta) => Number(receta.producto_id) === Number(produccion.producto_id)
      );

      recetaProducto.forEach((receta) => {
        const material = materialesPorId.get(Number(receta.material_id));

        const categoria =
          receta.materia_prima?.categoria ||
          material?.categoria ||
          "Sin categoría";

        const consumo =
          Number(receta.cantidad_por_unidad || 0) *
          Number(produccion.cantidad_producida || 0);

        consumoPorCategoria.set(
          categoria,
          (consumoPorCategoria.get(categoria) || 0) + consumo
        );
      });
    });

    const consumoTotal = Array.from(consumoPorCategoria.values()).reduce(
      (sum, value) => sum + value,
      0
    );

    const eficienciaMateriales: ConsumoMaterialCategoria[] = Array.from(
      consumoPorCategoria.entries()
    )
      .map(([material, consumo]) => ({
        material,
        consumo: Math.round(consumo * 100) / 100,
        porcentaje:
          consumoTotal > 0
            ? Math.round((consumo / consumoTotal) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.consumo - a.consumo);

    const inventarioCritico = materiales.filter(
      (m) => Number(m.cantidad_disponible) <= Number(m.stock_minimo)
    ).length;

    const disponibilidad =
      materiales.length > 0
        ? Math.round(
            ((materiales.length - inventarioCritico) / materiales.length) *
              1000
          ) / 10
        : 0;

    const metricasRendimiento = [
      { metrica: "Eficiencia", valor: eficienciaPromedio },
      { metrica: "Calidad", valor: tasaCalidad },
      { metrica: "Disponibilidad", valor: disponibilidad },
      {
        metrica: "Finalización",
        valor:
          produccionesValidas.length > 0
            ? Math.round(
                (produccionesFinalizadas.length / produccionesValidas.length) *
                  1000
              ) / 10
            : 0,
      },
      { metrica: "Inventario", valor: disponibilidad },
    ];

    return {
      produccionTotal,
      produccionMes,
      ingresosAnio,
      ingresosMes,
      eficienciaPromedio,
      tasaCalidad,
      tendenciaProduccion,
      tendenciaIngresos,
      tendenciasMensuales: meses,
      metricasRendimiento,
      seriesManga,
      productividadDiaria: dias,
      lineas,
      eficienciaMateriales,
      mermaTotal,
      inventarioCritico,
    };
  }, [producciones, mermas, materiales, recetas]);

  const exportarCSV = () => {
    const filas = [
      ["Métrica", "Valor"],
      ["Producción total", datosCalculados.produccionTotal],
      ["Ingresos año", datosCalculados.ingresosAnio],
      ["Eficiencia promedio", `${datosCalculados.eficienciaPromedio}%`],
      ["Tasa de calidad", `${datosCalculados.tasaCalidad}%`],
      ["Merma del mes", datosCalculados.mermaTotal],
      ["Inventario crítico", datosCalculados.inventarioCritico],
    ];

    const csv = filas.map((fila) => fila.join(",")).join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reporte_analitica_mangaforge.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const maxSerie = Math.max(
    ...datosCalculados.seriesManga.map((s) => s.unidades),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Analítica Avanzada
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Métricas ejecutivas calculadas con datos reales de producción,
            inventario y mermas
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="border-slate-700 text-slate-300">
            <Calendar className="w-4 h-4 mr-2" />
            Últimos 6 meses
          </Button>

          <Button
            variant="outline"
            className="border-slate-700 text-slate-300"
            onClick={cargarDatos}
          >
            <Filter className="w-4 h-4 mr-2" />
            Actualizar
          </Button>

          <Button
            onClick={exportarCSV}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {cargando ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-16 text-center text-slate-400">
            Cargando analítica...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border-purple-500/30 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400">
                        Producción Total
                      </p>

                      <h3 className="text-3xl font-bold text-slate-100 mt-2">
                        {datosCalculados.produccionTotal.toLocaleString(
                          "es-MX"
                        )}
                      </h3>

                      <div className="flex items-center gap-2 mt-2">
                        {datosCalculados.tendenciaProduccion >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}

                        <span
                          className={`text-sm ${
                            datosCalculados.tendenciaProduccion >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {datosCalculados.tendenciaProduccion >= 0 ? "+" : ""}
                          {datosCalculados.tendenciaProduccion.toFixed(1)}% mes
                          actual
                        </span>
                      </div>
                    </div>

                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      Año
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 border-cyan-500/30 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400">
                        Ingresos Estimados
                      </p>

                      <h3 className="text-3xl font-bold text-slate-100 mt-2">
                        $
                        {datosCalculados.ingresosAnio.toLocaleString("es-MX")}
                      </h3>

                      <div className="flex items-center gap-2 mt-2">
                        {datosCalculados.tendenciaIngresos >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}

                        <span
                          className={`text-sm ${
                            datosCalculados.tendenciaIngresos >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {datosCalculados.tendenciaIngresos >= 0 ? "+" : ""}
                          {datosCalculados.tendenciaIngresos.toFixed(1)}% mes
                          actual
                        </span>
                      </div>
                    </div>

                    <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                      MXN
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400">
                        Eficiencia Promedio
                      </p>

                      <h3 className="text-3xl font-bold text-slate-100 mt-2">
                        {datosCalculados.eficienciaPromedio.toFixed(1)}%
                      </h3>

                      <p className="text-xs text-slate-500 mt-2">
                        estimado vs real
                      </p>
                    </div>

                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      Real
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-pink-900/30 to-pink-800/20 border-pink-500/30 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400">
                        Tasa de Calidad
                      </p>

                      <h3 className="text-3xl font-bold text-slate-100 mt-2">
                        {datosCalculados.tasaCalidad.toFixed(1)}%
                      </h3>

                      <p className="text-xs text-slate-500 mt-2">
                        Merma mes:{" "}
                        {datosCalculados.mermaTotal.toLocaleString("es-MX")}
                      </p>
                    </div>

                    <Badge className="bg-pink-500/20 text-pink-300 border-pink-500/30">
                      Mes
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-2"
            >
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Tendencias de Producción e Ingresos
                  </CardTitle>

                  <p className="text-sm text-slate-500">
                    Análisis histórico de 6 meses
                  </p>
                </CardHeader>

                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <ComposedChart data={datosCalculados.tendenciasMensuales}>
                      <defs>
                        <linearGradient
                          id="gradienteProduccion"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#8b5cf6"
                            stopOpacity={0.3}
                          />

                          <stop
                            offset="95%"
                            stopColor="#8b5cf6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="mes" stroke="#64748b" />
                      <YAxis yAxisId="izquierda" stroke="#64748b" />
                      <YAxis
                        yAxisId="derecha"
                        orientation="right"
                        stroke="#64748b"
                      />

                      <Tooltip {...tooltipOscuro} />

                      <Area
                        yAxisId="izquierda"
                        type="monotone"
                        dataKey="produccion"
                        name="Producción"
                        fill="url(#gradienteProduccion)"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                      />

                      <Bar
                        yAxisId="derecha"
                        dataKey="ingresos"
                        name="Ingresos"
                        fill="#06b6d4"
                        radius={[8, 8, 0, 0]}
                      />

                      <Line
                        yAxisId="izquierda"
                        type="monotone"
                        dataKey="eficiencia"
                        name="Eficiencia %"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Métricas de Rendimiento
                  </CardTitle>

                  <p className="text-sm text-slate-500">
                    Calculadas con producción real
                  </p>
                </CardHeader>

                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={datosCalculados.metricasRendimiento}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="metrica" stroke="#64748b" />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        stroke="#64748b"
                      />

                      <Radar
                        name="Rendimiento"
                        dataKey="valor"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.5}
                      />

                      <Tooltip {...tooltipOscuro} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Rendimiento por Serie de Manga
                  </CardTitle>

                  <p className="text-sm text-slate-500">
                    Producción acumulada e ingresos estimados
                  </p>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {datosCalculados.seriesManga.length === 0 ? (
                      <div className="py-12 text-center text-slate-400">
                        No hay producción registrada.
                      </div>
                    ) : (
                      datosCalculados.seriesManga.map((serie) => (
                        <div
                          key={serie.nombre}
                          className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-200">
                              {serie.nombre}
                            </span>

                            <div className="flex items-center gap-2">
                              {serie.tendencia >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-green-400" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                              )}

                              <span
                                className={`text-sm ${
                                  serie.tendencia >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                }`}
                              >
                                {serie.tendencia >= 0 ? "+" : ""}
                                {serie.tendencia}%
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Unidades</p>
                              <p className="text-slate-300 font-medium">
                                {serie.unidades.toLocaleString("es-MX")}
                              </p>
                            </div>

                            <div>
                              <p className="text-slate-500">Ingresos</p>
                              <p className="text-slate-300 font-medium">
                                ${serie.ingresos.toLocaleString("es-MX")}
                              </p>
                            </div>
                          </div>

                          <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-3">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full"
                              style={{
                                width: `${(serie.unidades / maxSerie) * 100}%`,
                              }}
                            />
                          </div>
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
              transition={{ delay: 0.8 }}
            >
              <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-slate-100">
                    Productividad por Línea
                  </CardTitle>

                  <p className="text-sm text-slate-500">
                    Producción diaria de los últimos 7 días
                  </p>
                </CardHeader>

                <CardContent>
                  <ResponsiveContainer width="100%" height={380}>
                    <LineChart data={datosCalculados.productividadDiaria}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="fecha" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip {...tooltipOscuro} />

                      {datosCalculados.lineas.map((linea, index) => (
                        <Line
                          key={linea}
                          type="monotone"
                          dataKey={linea}
                          stroke={coloresLineas[index % coloresLineas.length]}
                          strokeWidth={2}
                          dot={{
                            fill: coloresLineas[index % coloresLineas.length],
                            r: 4,
                          }}
                          name={linea}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-slate-100">
                  Consumo Estimado de Materiales
                </CardTitle>

                <p className="text-sm text-slate-500">
                  Calculado con recetas y producción del mes actual
                </p>
              </CardHeader>

              <CardContent>
                {datosCalculados.eficienciaMateriales.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No hay datos suficientes de recetas y producción para calcular consumo.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={datosCalculados.eficienciaMateriales}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis
                        dataKey="material"
                        type="category"
                        stroke="#64748b"
                        width={120}
                      />

                      <Tooltip {...tooltipOscuro} />

                      <Bar
                        dataKey="consumo"
                        fill="#10b981"
                        radius={[0, 8, 8, 0]}
                        name="Consumo estimado"
                      />

                      <Bar
                        dataKey="porcentaje"
                        fill="#8b5cf6"
                        radius={[0, 8, 8, 0]}
                        name="Participación %"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}