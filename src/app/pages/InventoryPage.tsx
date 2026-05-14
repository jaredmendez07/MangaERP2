import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { motion } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import {
  Search,
  Plus,
  FileText,
  Droplet,
  Package,
  Box,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Edit,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";

interface MaterialInventario {
  id: number;
  nombre: string;
  categoria: string;
  cantidad_disponible: number;
  unidad: string;
  stock_minimo: number;
  estado: string;
  created_at: string;
}

type FormMaterial = {
  nombre: string;
  categoria: string;
  cantidad_disponible: string;
  unidad: string;
  stock_minimo: string;
};

const categoriasBase = [
  { nombre: "Todos", icono: Package },
  { nombre: "Papel", icono: FileText },
  { nombre: "Tinta", icono: Droplet },
  { nombre: "Portada", icono: Box },
  { nombre: "Empaque", icono: Package },
  { nombre: "Encuadernado", icono: Package },
];

const categoriasMaterial = [
  "Papel",
  "Tinta",
  "Portada",
  "Empaque",
  "Encuadernado",
];

const unidadesMaterial = [
  "hojas",
  "litros",
  "piezas",
  "kilogramos",
  "metros",
  "paquetes",
];

const formInicial: FormMaterial = {
  nombre: "",
  categoria: "",
  cantidad_disponible: "",
  unidad: "",
  stock_minimo: "",
};

export function InventoryPage() {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [inventario, setInventario] = useState<MaterialInventario[]>([]);
  const [cargando, setCargando] = useState(true);

  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalRestockAbierto, setModalRestockAbierto] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [reabasteciendo, setReabasteciendo] = useState(false);

  const [materialEditando, setMaterialEditando] =
    useState<MaterialInventario | null>(null);

  const [materialRestock, setMaterialRestock] =
    useState<MaterialInventario | null>(null);

  const [formMaterial, setFormMaterial] = useState<FormMaterial>(formInicial);
  const [cantidadRestock, setCantidadRestock] = useState("");

  useEffect(() => {
    obtenerInventario();
  }, []);

  const obtenerInventario = async () => {
    setCargando(true);

    const { data, error } = await supabase
      .from("materia_prima")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Error al obtener inventario:", error.message);
      setInventario([]);
    } else {
      setInventario(data || []);
    }

    setCargando(false);
  };

  const limpiarFormulario = () => {
    setFormMaterial(formInicial);
    setMaterialEditando(null);
    setMaterialRestock(null);
    setCantidadRestock("");
  };

  const bloquearNumerosInvalidos = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const validarMaterial = () => {
    const nombre = formMaterial.nombre.trim();
    const categoria = formMaterial.categoria.trim();
    const unidad = formMaterial.unidad.trim();

    const cantidad = Number(formMaterial.cantidad_disponible);
    const stockMinimo = Number(formMaterial.stock_minimo);

    if (!nombre) {
      alert("Ingresa el nombre del material.");
      return null;
    }

    if (!categoria) {
      alert("Selecciona una categoría.");
      return null;
    }

    if (!unidad) {
      alert("Selecciona una unidad.");
      return null;
    }

    if (
      formMaterial.cantidad_disponible === "" ||
      Number.isNaN(cantidad) ||
      cantidad < 0
    ) {
      alert("La cantidad disponible debe ser un número válido mayor o igual a 0.");
      return null;
    }

    if (
      formMaterial.stock_minimo === "" ||
      Number.isNaN(stockMinimo) ||
      stockMinimo < 0
    ) {
      alert("El stock mínimo debe ser un número válido mayor o igual a 0.");
      return null;
    }

    return {
      nombre,
      categoria,
      cantidad_disponible: cantidad,
      unidad,
      stock_minimo: stockMinimo,
      estado: "disponible",
    };
  };

  const agregarMaterial = async () => {
    const datos = validarMaterial();
    if (!datos) return;

    setGuardando(true);

    const { error } = await supabase.from("materia_prima").insert([datos]);

    if (error) {
      console.error("Error al agregar material:", error.message);
      alert("No se pudo agregar el material.");
      setGuardando(false);
      return;
    }

    setModalAgregarAbierto(false);
    limpiarFormulario();
    await obtenerInventario();
    setGuardando(false);
  };

  const abrirEditar = (item: MaterialInventario) => {
    setMaterialEditando(item);
    setFormMaterial({
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad_disponible: String(item.cantidad_disponible),
      unidad: item.unidad,
      stock_minimo: String(item.stock_minimo),
    });
    setModalEditarAbierto(true);
  };

  const editarMaterial = async () => {
    if (!materialEditando) return;

    const datos = validarMaterial();
    if (!datos) return;

    setEditando(true);

    const { error } = await supabase
      .from("materia_prima")
      .update(datos)
      .eq("id", materialEditando.id);

    if (error) {
      console.error("Error al editar material:", error.message);
      alert("No se pudo editar el material.");
      setEditando(false);
      return;
    }

    setModalEditarAbierto(false);
    limpiarFormulario();
    await obtenerInventario();
    setEditando(false);
  };

  const eliminarMaterial = async (item: MaterialInventario) => {
    const confirmar = confirm(
      `¿Seguro que quieres eliminar "${item.nombre}"?\n\nSi este material está ligado a recetas, Supabase puede bloquear la eliminación.`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("materia_prima")
      .delete()
      .eq("id", item.id);

    if (error) {
      console.error("Error al eliminar material:", error.message);
      alert(
        "No se pudo eliminar el material. Puede estar relacionado con una receta o producción."
      );
      return;
    }

    await obtenerInventario();
  };

  const abrirRestock = (item: MaterialInventario) => {
    setMaterialRestock(item);
    setCantidadRestock("");
    setModalRestockAbierto(true);
  };

  const hacerRestock = async () => {
    if (!materialRestock) return;

    const cantidad = Number(cantidadRestock);

    if (cantidadRestock === "" || Number.isNaN(cantidad) || cantidad <= 0) {
      alert("Ingresa una cantidad de reabastecimiento mayor a 0.");
      return;
    }

    setReabasteciendo(true);

    const nuevaCantidad =
      Number(materialRestock.cantidad_disponible || 0) + cantidad;

    const { error } = await supabase
      .from("materia_prima")
      .update({
        cantidad_disponible: nuevaCantidad,
      })
      .eq("id", materialRestock.id);

    if (error) {
      console.error("Error al reabastecer material:", error.message);
      alert("No se pudo reabastecer el material.");
      setReabasteciendo(false);
      return;
    }

    setModalRestockAbierto(false);
    limpiarFormulario();
    await obtenerInventario();
    setReabasteciendo(false);
  };

  const obtenerEstadoCalculado = (item: MaterialInventario) => {
    const cantidad = Number(item.cantidad_disponible);
    const minimo = Number(item.stock_minimo);

    if (cantidad <= minimo) return "critico";
    if (cantidad <= minimo * 1.5) return "advertencia";
    return "bueno";
  };

  const inventarioFiltrado = inventario.filter((item) => {
    const textoBusqueda = busqueda.toLowerCase();

    const coincideBusqueda =
      item.nombre.toLowerCase().includes(textoBusqueda) ||
      item.categoria.toLowerCase().includes(textoBusqueda) ||
      item.unidad.toLowerCase().includes(textoBusqueda);

    const coincideCategoria =
      categoriaSeleccionada === "Todos" || item.categoria === categoriaSeleccionada;

    return coincideBusqueda && coincideCategoria;
  });

  const categorias = useMemo(() => {
    return categoriasBase.map((categoria) => ({
      ...categoria,
      cantidad:
        categoria.nombre === "Todos"
          ? inventario.length
          : inventario.filter((item) => item.categoria === categoria.nombre)
              .length,
    }));
  }, [inventario]);

  const totalArticulos = inventario.length;

  const stockBueno = inventario.filter(
    (item) => obtenerEstadoCalculado(item) === "bueno"
  ).length;

  const stockBajo = inventario.filter(
    (item) => obtenerEstadoCalculado(item) === "advertencia"
  ).length;

  const stockCritico = inventario.filter(
    (item) => obtenerEstadoCalculado(item) === "critico"
  ).length;

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case "bueno":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "advertencia":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "critico":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const obtenerIconoEstado = (estado: string) => {
    switch (estado) {
      case "bueno":
        return <CheckCircle className="w-4 h-4" />;
      case "advertencia":
        return <AlertTriangle className="w-4 h-4" />;
      case "critico":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const obtenerTextoEstado = (estado: string) => {
    switch (estado) {
      case "bueno":
        return "Bueno";
      case "advertencia":
        return "Stock bajo";
      case "critico":
        return "Crítico";
      default:
        return "Sin estado";
    }
  };

  const cerrarModalAgregar = () => {
    setModalAgregarAbierto(false);
    limpiarFormulario();
  };

  const cerrarModalEditar = () => {
    setModalEditarAbierto(false);
    limpiarFormulario();
  };

  const cerrarModalRestock = () => {
    setModalRestockAbierto(false);
    limpiarFormulario();
  };

  const FormularioMaterial = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-slate-200">Nombre del material</Label>
        <Input
          placeholder="Ej: Papel offset, Tinta negra, Pegamento"
          value={formMaterial.nombre}
          onChange={(e) =>
            setFormMaterial({ ...formMaterial, nombre: e.target.value })
          }
          className="bg-slate-800/50 border-slate-700 text-slate-100"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Categoría</Label>
        <Select
          value={formMaterial.categoria}
          onValueChange={(value) =>
            setFormMaterial({ ...formMaterial, categoria: value })
          }
        >
          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
            {categoriasMaterial.map((cat) => (
              <SelectItem
                key={cat}
                value={cat}
                className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
              >
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-slate-200">Cantidad disponible</Label>
          <Input
            type="number"
            min="0"
            step="0.001"
            inputMode="decimal"
            placeholder="Ej: 500"
            value={formMaterial.cantidad_disponible}
            onKeyDown={bloquearNumerosInvalidos}
            onChange={(e) =>
              setFormMaterial({
                ...formMaterial,
                cantidad_disponible: e.target.value,
              })
            }
            className="bg-slate-800/50 border-slate-700 text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Unidad</Label>
          <Select
            value={formMaterial.unidad}
            onValueChange={(value) =>
              setFormMaterial({ ...formMaterial, unidad: value })
            }
          >
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
              <SelectValue placeholder="Unidad" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
              {unidadesMaterial.map((unidad) => (
                <SelectItem
                  key={unidad}
                  value={unidad}
                  className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
                >
                  {unidad}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Stock mínimo</Label>
        <Input
          type="number"
          min="0"
          step="0.001"
          inputMode="decimal"
          placeholder="Ej: 100"
          value={formMaterial.stock_minimo}
          onKeyDown={bloquearNumerosInvalidos}
          onChange={(e) =>
            setFormMaterial({ ...formMaterial, stock_minimo: e.target.value })
          }
          className="bg-slate-800/50 border-slate-700 text-slate-100"
        />
        <p className="text-xs text-slate-500">
          Si la cantidad disponible llega a este valor, el material se marcará
          como crítico.
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Gestión de Inventario
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Seguimiento y control de materias primas y suministros
          </p>
        </div>

        <Button
          onClick={() => {
            limpiarFormulario();
            setModalAgregarAbierto(true);
          }}
          className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Material
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total de Artículos</p>
                <p className="text-2xl font-bold text-slate-100 mt-1">
                  {totalArticulos}
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-400" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Stock Bueno</p>
                <p className="text-2xl font-bold text-green-400 mt-1">
                  {stockBueno}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Stock Bajo</p>
                <p className="text-2xl font-bold text-yellow-400 mt-1">
                  {stockBajo}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Crítico</p>
                <p className="text-2xl font-bold text-red-400 mt-1">
                  {stockCritico}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {categorias.map((categoria) => {
          const Icono = categoria.icono;

          return (
            <button
              key={categoria.nombre}
              onClick={() => setCategoriaSeleccionada(categoria.nombre)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                categoriaSeleccionada === categoria.nombre
                  ? "bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border-purple-500/50 text-purple-300"
                  : "bg-slate-800/30 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              <Icono className="w-4 h-4" />
              <span>{categoria.nombre}</span>
              <Badge
                variant="secondary"
                className="ml-1 bg-slate-700/50 text-slate-300"
              >
                {categoria.cantidad}
              </Badge>
            </button>
          );
        })}
      </div>

      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-slate-100">
              Inventario de Materiales
            </CardTitle>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Buscar materiales..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {cargando ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-slate-700 mx-auto mb-3 animate-pulse" />
              <p className="text-slate-400">Cargando inventario...</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800/50 hover:bg-slate-800/50 border-slate-700">
                      <TableHead className="text-slate-300">Material</TableHead>
                      <TableHead className="text-slate-300">Categoría</TableHead>
                      <TableHead className="text-slate-300">Cantidad</TableHead>
                      <TableHead className="text-slate-300">Estado</TableHead>
                      <TableHead className="text-slate-300">
                        Stock mínimo
                      </TableHead>
                      <TableHead className="text-slate-300">
                        Fecha de registro
                      </TableHead>
                      <TableHead className="text-slate-300 text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {inventarioFiltrado.map((item, indice) => {
                      const estadoCalculado = obtenerEstadoCalculado(item);

                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: indice * 0.05 }}
                          className="border-slate-800 hover:bg-slate-800/30 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-200">
                            {item.nombre}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className="border-slate-600 text-slate-400"
                            >
                              {item.categoria}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-slate-300">
                            {Number(item.cantidad_disponible).toLocaleString()}{" "}
                            {item.unidad}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant="outline"
                              className={obtenerColorEstado(estadoCalculado)}
                            >
                              <span className="flex items-center gap-1">
                                {obtenerIconoEstado(estadoCalculado)}
                                {obtenerTextoEstado(estadoCalculado)}
                              </span>
                            </Badge>
                          </TableCell>

                          <TableCell className="text-slate-400">
                            {Number(item.stock_minimo).toLocaleString()}{" "}
                            {item.unidad}
                          </TableCell>

                          <TableCell className="text-slate-400">
                            {new Date(item.created_at).toLocaleDateString(
                              "es-MX"
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => abrirRestock(item)}
                                className="text-slate-400 hover:text-green-400"
                                title="Reabastecer"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => abrirEditar(item)}
                                className="text-slate-400 hover:text-purple-400"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => eliminarMaterial(item)}
                                className="text-slate-400 hover:text-red-400"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {inventarioFiltrado.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">
                    No se encontraron materiales que coincidan con la búsqueda.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {modalAgregarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Agregar material
                </h2>
                <p className="text-sm text-slate-500">
                  Registra una nueva materia prima para producción.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={cerrarModalAgregar}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <FormularioMaterial />

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={cerrarModalAgregar}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>

              <Button
                onClick={agregarMaterial}
                disabled={guardando}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
              >
                {guardando ? "Guardando..." : "Guardar material"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {modalEditarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Editar material
                </h2>
                <p className="text-sm text-slate-500">
                  Modifica la información del material seleccionado.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={cerrarModalEditar}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <FormularioMaterial />

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={cerrarModalEditar}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>

              <Button
                onClick={editarMaterial}
                disabled={editando}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
              >
                {editando ? "Actualizando..." : "Actualizar material"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {modalRestockAbierto && materialRestock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Reabastecer material
                </h2>
                <p className="text-sm text-slate-500">
                  Agrega stock al material seleccionado.
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={cerrarModalRestock}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-4 mb-4">
              <p className="text-slate-100 font-semibold">
                {materialRestock.nombre}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Stock actual:{" "}
                <span className="text-cyan-300">
                  {Number(materialRestock.cantidad_disponible).toLocaleString()}{" "}
                  {materialRestock.unidad}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">
                Cantidad a agregar ({materialRestock.unidad})
              </Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                placeholder="Ej: 100"
                value={cantidadRestock}
                onKeyDown={bloquearNumerosInvalidos}
                onChange={(e) => setCantidadRestock(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-100"
              />
              {cantidadRestock && (
                <p className="text-xs text-slate-500">
                  Nuevo stock estimado:{" "}
                  <span className="text-green-300">
                    {(
                      Number(materialRestock.cantidad_disponible || 0) +
                      Number(cantidadRestock || 0)
                    ).toLocaleString()}{" "}
                    {materialRestock.unidad}
                  </span>
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={cerrarModalRestock}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>

              <Button
                onClick={hacerRestock}
                disabled={reabasteciendo}
                className="bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {reabasteciendo ? "Guardando..." : "Reabastecer"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}