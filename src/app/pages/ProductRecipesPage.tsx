import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { motion } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";

import {
  ClipboardList,
  Save,
  BookOpen,
  Package,
  AlertTriangle,
  ImageIcon,
  CheckCircle2,
  Search,
} from "lucide-react";

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

interface RecetaProducto {
  id: number;
  producto_id: number;
  material_id: number;
  cantidad_por_unidad: number;
  created_at: string;
  productos_manga?: {
    titulo: string;
    volumen: number;
    tipo_edicion: string;
    imagen_url: string | null;
  };
  materia_prima?: {
    nombre: string;
    categoria: string;
    unidad: string;
  };
}

interface MaterialRecetaUI {
  material_id: number;
  seleccionado: boolean;
  cantidad_por_unidad: string;
}

export function ProductRecipesPage() {
  const [productos, setProductos] = useState<MangaProducto[]>([]);
  const [materiales, setMateriales] = useState<MaterialInventario[]>([]);
  const [recetas, setRecetas] = useState<RecetaProducto[]>([]);

  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState<number | null>(null);
  const [materialesReceta, setMaterialesReceta] = useState<MaterialRecetaUI[]>([]);
  const [busquedaManga, setBusquedaManga] = useState("");
  const [busquedaMaterial, setBusquedaMaterial] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    obtenerDatos();
  }, []);

  useEffect(() => {
    prepararMaterialesReceta();
  }, [productoSeleccionadoId, materiales, recetas]);

  const obtenerDatos = async () => {
    setCargando(true);

    const { data: productosData, error: productosError } = await supabase
      .from("productos_manga")
      .select("id, titulo, volumen, tipo_edicion, paginas, imagen_url, estado")
      .eq("estado", "activo")
      .order("titulo", { ascending: true });

    const { data: materialesData, error: materialesError } = await supabase
      .from("materia_prima")
      .select("id, nombre, categoria, unidad, cantidad_disponible")
      .order("nombre", { ascending: true });

    const { data: recetasData, error: recetasError } = await supabase
      .from("producto_materiales")
      .select(`
        *,
        productos_manga (
          titulo,
          volumen,
          tipo_edicion,
          imagen_url
        ),
        materia_prima (
          nombre,
          categoria,
          unidad
        )
      `)
      .order("id", { ascending: false });

    if (productosError) {
      console.error("Error al obtener mangas:", productosError.message);
      setProductos([]);
    } else {
      setProductos(productosData || []);
    }

    if (materialesError) {
      console.error("Error al obtener materiales:", materialesError.message);
      setMateriales([]);
    } else {
      setMateriales(materialesData || []);
    }

    if (recetasError) {
      console.error("Error al obtener recetas:", recetasError.message);
      setRecetas([]);
    } else {
      setRecetas(recetasData || []);
    }

    setCargando(false);
  };

  const prepararMaterialesReceta = () => {
    if (!productoSeleccionadoId) {
      setMaterialesReceta([]);
      return;
    }

    const recetaActual = recetas.filter(
      (receta) => receta.producto_id === productoSeleccionadoId
    );

    const lista = materiales.map((material) => {
      const materialEnReceta = recetaActual.find(
        (receta) => receta.material_id === material.id
      );

      return {
        material_id: material.id,
        seleccionado: Boolean(materialEnReceta),
        cantidad_por_unidad: materialEnReceta
          ? String(materialEnReceta.cantidad_por_unidad)
          : "",
      };
    });

    setMaterialesReceta(lista);
  };

  const productoSeleccionado = productos.find(
    (producto) => producto.id === productoSeleccionadoId
  );

  const recetasDelProducto = recetas.filter(
    (receta) => receta.producto_id === productoSeleccionadoId
  );

  const productosFiltrados = productos.filter((producto) => {
    const texto = busquedaManga.toLowerCase();

    return (
      producto.titulo.toLowerCase().includes(texto) ||
      String(producto.volumen).includes(texto) ||
      producto.tipo_edicion.toLowerCase().includes(texto)
    );
  });

  const materialesFiltrados = materiales.filter((material) => {
    const texto = busquedaMaterial.toLowerCase();

    return (
      material.nombre.toLowerCase().includes(texto) ||
      material.categoria.toLowerCase().includes(texto) ||
      material.unidad.toLowerCase().includes(texto)
    );
  });

  const estadisticas = useMemo(() => {
    const productosConReceta = new Set(recetas.map((receta) => receta.producto_id)).size;

    return {
      totalMangas: productos.length,
      productosConReceta,
      productosSinReceta: productos.length - productosConReceta,
      materialesDisponibles: materiales.length,
    };
  }, [productos, recetas, materiales]);

  const obtenerEstadoRecetaProducto = (productoId: number) => {
    const cantidad = recetas.filter((receta) => receta.producto_id === productoId).length;
    return cantidad;
  };

  const actualizarSeleccionMaterial = (materialId: number, seleccionado: boolean) => {
    setMaterialesReceta((prev) =>
      prev.map((item) =>
        item.material_id === materialId
          ? {
              ...item,
              seleccionado,
              cantidad_por_unidad: seleccionado ? item.cantidad_por_unidad : "",
            }
          : item
      )
    );
  };

  const actualizarCantidadMaterial = (materialId: number, valor: string) => {
    if (valor !== "" && !/^\d*\.?\d*$/.test(valor)) return;

    setMaterialesReceta((prev) =>
      prev.map((item) =>
        item.material_id === materialId
          ? {
              ...item,
              cantidad_por_unidad: valor,
              seleccionado: valor !== "" ? true : item.seleccionado,
            }
          : item
      )
    );
  };

  const bloquearCaracteresInvalidos = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const guardarRecetaCompleta = async () => {
    if (!productoSeleccionadoId) {
      alert("Selecciona un manga.");
      return;
    }

    const materialesSeleccionados = materialesReceta.filter(
      (item) => item.seleccionado
    );

    if (materialesSeleccionados.length === 0) {
      alert("Selecciona al menos un material para la receta.");
      return;
    }

    for (const item of materialesSeleccionados) {
      const cantidad = Number(item.cantidad_por_unidad);

      if (!item.cantidad_por_unidad.trim()) {
        alert("Todos los materiales seleccionados deben tener cantidad.");
        return;
      }

      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        alert("Las cantidades deben ser mayores a 0.");
        return;
      }
    }

    setGuardando(true);

    const { error: deleteError } = await supabase
      .from("producto_materiales")
      .delete()
      .eq("producto_id", productoSeleccionadoId);

    if (deleteError) {
      console.error("Error al limpiar receta anterior:", deleteError.message);
      alert("No se pudo actualizar la receta.");
      setGuardando(false);
      return;
    }

    const nuevosRegistros = materialesSeleccionados.map((item) => ({
      producto_id: productoSeleccionadoId,
      material_id: item.material_id,
      cantidad_por_unidad: Number(item.cantidad_por_unidad),
    }));

    const { error: insertError } = await supabase
      .from("producto_materiales")
      .insert(nuevosRegistros);

    if (insertError) {
      console.error("Error al guardar receta:", insertError.message);
      alert("No se pudo guardar la receta.");
      setGuardando(false);
      return;
    }

    await obtenerDatos();
    setGuardando(false);
    alert("Receta guardada correctamente.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Recetas de Producción
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Selecciona un manga y configura todos sus materiales desde el inventario.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Mangas activos</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {estadisticas.totalMangas}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-purple-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Con receta</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {estadisticas.productosConReceta}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Sin receta</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {estadisticas.productosSinReceta}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Materiales</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">
                {estadisticas.materialesDisponibles}
              </p>
            </div>
            <Package className="w-8 h-8 text-cyan-400" />
          </CardContent>
        </Card>
      </div>

      {cargando ? (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-12 text-center text-slate-400">
            Cargando recetas...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <Card className="xl:col-span-4 bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">
                Catálogo de mangas
              </CardTitle>

              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="Buscar manga..."
                  value={busquedaManga}
                  onChange={(e) => setBusquedaManga(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {productosFiltrados.map((producto) => {
                  const cantidadMateriales = obtenerEstadoRecetaProducto(producto.id);
                  const activo = productoSeleccionadoId === producto.id;

                  return (
                    <button
                      key={producto.id}
                      onClick={() => setProductoSeleccionadoId(producto.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        activo
                          ? "border-purple-500/60 bg-purple-500/10"
                          : "border-slate-800 bg-slate-800/30 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-24 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                          {producto.imagen_url ? (
                            <img
                              src={producto.imagen_url}
                              alt={producto.titulo}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <ImageIcon className="w-7 h-7 text-slate-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-100 truncate">
                            {producto.titulo}
                          </h3>

                          <p className="text-sm text-slate-400 mt-1">
                            Vol. {producto.volumen} • {producto.paginas} páginas
                          </p>

                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10"
                            >
                              {producto.tipo_edicion}
                            </Badge>

                            <Badge
                              variant="outline"
                              className={
                                cantidadMateriales > 0
                                  ? "border-green-500/30 text-green-400 bg-green-500/10"
                                  : "border-yellow-500/30 text-yellow-400 bg-yellow-500/10"
                              }
                            >
                              {cantidadMateriales > 0
                                ? `${cantidadMateriales} materiales`
                                : "Sin receta"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {productosFiltrados.length === 0 && (
                  <div className="text-center py-10 text-slate-400">
                    No se encontraron mangas.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-8 bg-slate-900/50 border-slate-800">
            <CardHeader>
              {productoSeleccionado ? (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-28 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      {productoSeleccionado.imagen_url ? (
                        <img
                          src={productoSeleccionado.imagen_url}
                          alt={productoSeleccionado.titulo}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-500" />
                      )}
                    </div>

                    <div>
                      <CardTitle className="text-slate-100">
                        Receta de {productoSeleccionado.titulo}
                      </CardTitle>

                      <p className="text-sm text-slate-400 mt-2">
                        Volumen {productoSeleccionado.volumen} •{" "}
                        {productoSeleccionado.tipo_edicion} •{" "}
                        {productoSeleccionado.paginas} páginas
                      </p>

                      <div className="flex gap-2 mt-3">
                        <Badge
                          variant="outline"
                          className="border-purple-500/30 text-purple-300 bg-purple-500/10"
                        >
                          {recetasDelProducto.length} materiales guardados
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={guardarRecetaCompleta}
                    disabled={guardando}
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {guardando ? "Guardando..." : "Guardar receta"}
                  </Button>
                </div>
              ) : (
                <div>
                  <CardTitle className="text-slate-100">
                    Editor de receta
                  </CardTitle>
                  <p className="text-sm text-slate-500 mt-1">
                    Selecciona un manga del catálogo para consultar o modificar su receta.
                  </p>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {!productoSeleccionado ? (
                <div className="text-center py-20">
                  <ClipboardList className="w-14 h-14 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400">
                    Selecciona un manga para editar sus materiales.
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      placeholder="Buscar material del inventario..."
                      value={busquedaMaterial}
                      onChange={(e) => setBusquedaMaterial(e.target.value)}
                      className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-800 overflow-hidden">
                    <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-800/60 text-xs font-medium text-slate-400">
                      <div className="col-span-1">Usar</div>
                      <div className="col-span-4">Material</div>
                      <div className="col-span-2">Categoría</div>
                      <div className="col-span-2">Stock</div>
                      <div className="col-span-3">Cantidad por manga</div>
                    </div>

                    <div className="divide-y divide-slate-800 max-h-[520px] overflow-y-auto">
                      {materialesFiltrados.map((material, index) => {
                        const itemReceta = materialesReceta.find(
                          (item) => item.material_id === material.id
                        );

                        const seleccionado = itemReceta?.seleccionado || false;

                        return (
                          <motion.div
                            key={material.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className={`grid grid-cols-12 gap-3 items-center px-4 py-3 transition-colors ${
                              seleccionado
                                ? "bg-purple-500/10"
                                : "bg-slate-900/30 hover:bg-slate-800/30"
                            }`}
                          >
                            <div className="col-span-1">
                              <input
                                type="checkbox"
                                checked={seleccionado}
                                onChange={(e) =>
                                  actualizarSeleccionMaterial(
                                    material.id,
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 accent-purple-500"
                              />
                            </div>

                            <div className="col-span-4">
                              <p className="font-medium text-slate-200">
                                {material.nombre}
                              </p>
                              <p className="text-xs text-slate-500">
                                Unidad: {material.unidad}
                              </p>
                            </div>

                            <div className="col-span-2">
                              <Badge
                                variant="outline"
                                className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10"
                              >
                                {material.categoria}
                              </Badge>
                            </div>

                            <div className="col-span-2 text-sm text-slate-400">
                              {Number(material.cantidad_disponible).toLocaleString("es-MX")}{" "}
                              {material.unidad}
                            </div>

                            <div className="col-span-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0.0001"
                                  step="0.0001"
                                  inputMode="decimal"
                                  disabled={!seleccionado}
                                  placeholder="Ej: 1, 0.01"
                                  value={itemReceta?.cantidad_por_unidad || ""}
                                  onKeyDown={bloquearCaracteresInvalidos}
                                  onChange={(e) =>
                                    actualizarCantidadMaterial(
                                      material.id,
                                      e.target.value
                                    )
                                  }
                                  className="bg-slate-800/50 border-slate-700 text-slate-100 disabled:opacity-40"
                                />

                                <span className="text-xs text-slate-500 min-w-fit">
                                  {material.unidad}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {materialesFiltrados.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                          No se encontraron materiales en inventario.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3">
                      Resumen de receta
                    </h3>

                    {materialesReceta.filter((item) => item.seleccionado).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Aún no seleccionaste materiales para este manga.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {materialesReceta
                          .filter((item) => item.seleccionado)
                          .map((item) => {
                            const material = materiales.find(
                              (m) => m.id === item.material_id
                            );

                            return (
                              <div
                                key={item.material_id}
                                className="flex justify-between gap-4 text-sm"
                              >
                                <span className="text-slate-300">
                                  {material?.nombre}
                                </span>
                                <span className="text-cyan-300">
                                  {item.cantidad_por_unidad || "0"}{" "}
                                  {material?.unidad} por manga
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}