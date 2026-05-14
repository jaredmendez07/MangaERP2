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
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Layers,
  FileText,
  CheckCircle2,
  ImageIcon,
  DollarSign,
} from "lucide-react";

interface MangaProducto {
  id: number;
  titulo: string;
  volumen: number;
  tipo_edicion: string;
  paginas: number;
  estado: string;
  imagen_url: string | null;
  precio_venta: number | null;
  created_at: string;
}

interface MangaForm {
  titulo: string;
  volumen: string;
  tipo_edicion: string;
  paginas: string;
  imagen_url: string;
  precio_venta: string;
  estado: string;
}

const formInicial: MangaForm = {
  titulo: "",
  volumen: "",
  tipo_edicion: "",
  paginas: "",
  imagen_url: "",
  precio_venta: "",
  estado: "activo",
};

export function MangaProductsPage() {
  const [mangas, setMangas] = useState<MangaProducto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [mangaEditandoId, setMangaEditandoId] = useState<number | null>(null);

  const [nuevoManga, setNuevoManga] = useState<MangaForm>(formInicial);
  const [mangaEditando, setMangaEditando] = useState<MangaForm>(formInicial);

  useEffect(() => {
    obtenerMangas();
  }, []);

  const limpiarFormulario = () => {
    setNuevoManga(formInicial);
  };

  const limpiarFormularioEdicion = () => {
    setMangaEditandoId(null);
    setMangaEditando(formInicial);
  };

  const obtenerMangas = async () => {
    setCargando(true);

    const { data, error } = await supabase
      .from("productos_manga")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Error al obtener mangas:", error.message);
      setMangas([]);
    } else {
      setMangas(data || []);
    }

    setCargando(false);
  };

  const validarManga = (manga: MangaForm) => {
    const volumen = Number(manga.volumen);
    const paginas = Number(manga.paginas);
    const precioVenta = manga.precio_venta.trim()
      ? Number(manga.precio_venta)
      : 0;

    if (!manga.titulo.trim()) {
      alert("Ingresa el título del manga.");
      return null;
    }

    if (!manga.tipo_edicion) {
      alert("Selecciona el tipo de edición.");
      return null;
    }

    if (!manga.volumen.trim() || !Number.isInteger(volumen) || volumen <= 0) {
      alert("El volumen debe ser un número entero mayor a 0.");
      return null;
    }

    if (!manga.paginas.trim() || !Number.isInteger(paginas) || paginas <= 0) {
      alert("Las páginas deben ser un número entero mayor a 0.");
      return null;
    }

    if (!Number.isFinite(precioVenta) || precioVenta < 0) {
      alert("El precio de venta debe ser un número válido mayor o igual a 0.");
      return null;
    }

    return {
      titulo: manga.titulo.trim(),
      volumen,
      tipo_edicion: manga.tipo_edicion,
      paginas,
      imagen_url: manga.imagen_url.trim() || null,
      precio_venta: precioVenta,
      estado: manga.estado,
    };
  };

  const agregarManga = async () => {
    const datosValidados = validarManga(nuevoManga);

    if (!datosValidados) return;

    setGuardando(true);

    const { error } = await supabase
      .from("productos_manga")
      .insert([datosValidados]);

    if (error) {
      console.error("Error al agregar manga:", error.message);
      alert("No se pudo agregar el manga.");
      setGuardando(false);
      return;
    }

    setModalAbierto(false);
    limpiarFormulario();
    await obtenerMangas();
    setGuardando(false);
  };

  const abrirModalEditar = (manga: MangaProducto) => {
    setMangaEditandoId(manga.id);
    setMangaEditando({
      titulo: manga.titulo,
      volumen: String(manga.volumen),
      tipo_edicion: manga.tipo_edicion,
      paginas: String(manga.paginas),
      imagen_url: manga.imagen_url || "",
      precio_venta: manga.precio_venta !== null && manga.precio_venta !== undefined
        ? String(manga.precio_venta)
        : "",
      estado: manga.estado,
    });
    setModalEditarAbierto(true);
  };

  const actualizarManga = async () => {
    if (!mangaEditandoId) return;

    const datosValidados = validarManga(mangaEditando);

    if (!datosValidados) return;

    setEditando(true);

    const { error } = await supabase
      .from("productos_manga")
      .update(datosValidados)
      .eq("id", mangaEditandoId);

    if (error) {
      console.error("Error al actualizar manga:", error.message);
      alert("No se pudo actualizar el manga.");
      setEditando(false);
      return;
    }

    setModalEditarAbierto(false);
    limpiarFormularioEdicion();
    await obtenerMangas();
    setEditando(false);
  };

  const eliminarManga = async (id: number) => {
    const confirmar = confirm("¿Seguro que quieres eliminar este manga?");

    if (!confirmar) return;

    const { error } = await supabase
      .from("productos_manga")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar manga:", error.message);
      alert(
        "No se pudo eliminar el manga. Puede estar relacionado con una producción o receta."
      );
      return;
    }

    obtenerMangas();
  };

  const mangasFiltrados = mangas.filter((manga) => {
    const texto = busqueda.toLowerCase();

    return (
      manga.titulo.toLowerCase().includes(texto) ||
      manga.tipo_edicion.toLowerCase().includes(texto) ||
      String(manga.volumen).includes(texto) ||
      String(manga.precio_venta ?? 0).includes(texto)
    );
  });

  const estadisticas = useMemo(() => {
    const activos = mangas.filter((m) => m.estado === "activo");
    const precioPromedio = activos.length
      ? activos.reduce((total, m) => total + Number(m.precio_venta || 0), 0) /
        activos.length
      : 0;

    return {
      total: mangas.length,
      activos: activos.length,
      especiales: mangas.filter((m) => m.tipo_edicion === "Especial").length,
      precioPromedio,
    };
  }, [mangas]);

  const formatoMoneda = (valor: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor || 0);
  };

  const bloquearEnterosInvalidos = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (["-", "+", "e", "E", "."].includes(e.key)) {
      e.preventDefault();
    }
  };

  const bloquearDecimalesInvalidos = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (["-", "+", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleNumeroEntero = (
    valor: string,
    setter: React.Dispatch<React.SetStateAction<MangaForm>>,
    campo: "volumen" | "paginas",
    estadoActual: MangaForm
  ) => {
    if (valor === "" || /^\d+$/.test(valor)) {
      setter({ ...estadoActual, [campo]: valor });
    }
  };

  const handleDecimal = (
    valor: string,
    setter: React.Dispatch<React.SetStateAction<MangaForm>>,
    campo: "precio_venta",
    estadoActual: MangaForm
  ) => {
    if (valor === "" || /^\d*\.?\d{0,2}$/.test(valor)) {
      setter({ ...estadoActual, [campo]: valor });
    }
  };

  const renderFormularioManga = (
    datos: typeof nuevoManga,
    setDatos: React.Dispatch<React.SetStateAction<typeof nuevoManga>>
  ) => (
    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        <Label className="text-slate-200">Título</Label>
        <Input
          placeholder="Ej: Shonen Star"
          value={datos.titulo}
          onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
          className="bg-slate-800/50 border-slate-700 text-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-slate-200">Volumen</Label>
          <Input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="Ej: 1"
            value={datos.volumen}
            onKeyDown={bloquearEnterosInvalidos}
            onChange={(e) =>
              handleNumeroEntero(e.target.value, setDatos, "volumen", datos)
            }
            className="bg-slate-800/50 border-slate-700 text-slate-100"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-200">Páginas</Label>
          <Input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="Ej: 192"
            value={datos.paginas}
            onKeyDown={bloquearEnterosInvalidos}
            onChange={(e) =>
              handleNumeroEntero(e.target.value, setDatos, "paginas", datos)
            }
            className="bg-slate-800/50 border-slate-700 text-slate-100"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Precio de venta</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Ej: 129.00"
            value={datos.precio_venta}
            onKeyDown={bloquearDecimalesInvalidos}
            onChange={(e) =>
              handleDecimal(e.target.value, setDatos, "precio_venta", datos)
            }
            className="pl-9 bg-slate-800/50 border-slate-700 text-slate-100"
          />
        </div>
        <p className="text-xs text-slate-500">
          Este precio alimenta los ingresos estimados en Analítica.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Tipo de edición</Label>
        <Select
          value={datos.tipo_edicion}
          onValueChange={(value) =>
            setDatos({ ...datos, tipo_edicion: value })
          }
        >
          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
            <SelectValue placeholder="Selecciona una edición" />
          </SelectTrigger>

          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
            <SelectItem
              value="Estándar"
              className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
            >
              Estándar
            </SelectItem>
            <SelectItem
              value="Especial"
              className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
            >
              Especial
            </SelectItem>
            <SelectItem
              value="Coleccionista"
              className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
            >
              Coleccionista
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">Estado</Label>
        <Select
          value={datos.estado}
          onValueChange={(value) => setDatos({ ...datos, estado: value })}
        >
          <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-100">
            <SelectValue placeholder="Selecciona un estado" />
          </SelectTrigger>

          <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
            <SelectItem
              value="activo"
              className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
            >
              Activo
            </SelectItem>
            <SelectItem
              value="inactivo"
              className="text-slate-100 focus:bg-slate-800 focus:text-cyan-300"
            >
              Inactivo
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-slate-200">URL de imagen</Label>
        <Input
          placeholder="https://ejemplo.com/portada.jpg"
          value={datos.imagen_url}
          onChange={(e) => setDatos({ ...datos, imagen_url: e.target.value })}
          className="bg-slate-800/50 border-slate-700 text-slate-100"
        />
      </div>

      {datos.imagen_url && (
        <div className="space-y-2">
          <Label className="text-slate-200">Vista previa</Label>
          <div className="w-24 h-36 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
            <img
              src={datos.imagen_url}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            Productos Manga
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registra precios, portadas y datos editoriales para calcular ingresos
          </p>
        </div>

        <Button
          onClick={() => setModalAbierto(true)}
          className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Manga
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total de Mangas</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">
                {estadisticas.total}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-purple-400" />
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
              <p className="text-sm text-slate-400">Edición Especial</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">
                {estadisticas.especiales}
              </p>
            </div>
            <Layers className="w-8 h-8 text-cyan-400" />
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Precio promedio</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {formatoMoneda(estadisticas.precioPromedio)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-400" />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-slate-100">
              Catálogo de Mangas
            </CardTitle>

            <Input
              placeholder="Buscar por título, volumen, edición o precio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-80 bg-slate-800/50 border-slate-700 text-slate-100"
            />
          </div>
        </CardHeader>

        <CardContent>
          {cargando ? (
            <div className="text-center py-12 text-slate-400">
              Cargando mangas...
            </div>
          ) : (
            <div className="space-y-4">
              {mangasFiltrados.map((manga, index) => (
                <motion.div
                  key={manga.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-24 rounded-lg overflow-hidden bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                      {manga.imagen_url ? (
                        <img
                          src={manga.imagen_url}
                          alt={manga.titulo}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-purple-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-slate-100">
                          {manga.titulo} Vol. {manga.volumen}
                        </h3>

                        <Badge
                          variant="outline"
                          className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10"
                        >
                          {manga.tipo_edicion}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={
                            manga.estado === "activo"
                              ? "border-green-500/30 text-green-400 bg-green-500/10"
                              : "border-red-500/30 text-red-400 bg-red-500/10"
                          }
                        >
                          {manga.estado === "activo" ? "Activo" : "Inactivo"}
                        </Badge>

                        <Badge
                          variant="outline"
                          className="border-yellow-500/30 text-yellow-300 bg-yellow-500/10"
                        >
                          {formatoMoneda(Number(manga.precio_venta || 0))}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400 flex-wrap">
                        <span>{manga.paginas} páginas</span>
                        <span>•</span>
                        <span>
                          Registrado: {" "}
                          {new Date(manga.created_at).toLocaleDateString(
                            "es-MX"
                          )}
                        </span>
                      </div>

                      {manga.imagen_url && (
                        <p className="text-xs text-slate-500 mt-2 max-w-xl truncate">
                          Imagen: {manga.imagen_url}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirModalEditar(manga)}
                      className="text-slate-400 hover:text-purple-400"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => eliminarManga(manga.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}

              {mangasFiltrados.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400">
                    No se encontraron mangas registrados.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-100">
                Agregar Manga
              </h2>
              <p className="text-sm text-slate-500">
                Registra un nuevo producto para producción editorial.
              </p>
            </div>

            {renderFormularioManga(nuevoManga, setNuevoManga)}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setModalAbierto(false);
                  limpiarFormulario();
                }}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>

              <Button
                onClick={agregarManga}
                disabled={guardando}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {modalEditarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-100">
                Editar Manga
              </h2>
              <p className="text-sm text-slate-500">
                Modifica la información del producto seleccionado.
              </p>
            </div>

            {renderFormularioManga(mangaEditando, setMangaEditando)}

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setModalEditarAbierto(false);
                  limpiarFormularioEdicion();
                }}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>

              <Button
                onClick={actualizarManga}
                disabled={editando}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
              >
                {editando ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
