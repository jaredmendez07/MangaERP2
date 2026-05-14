import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

const getMexicoDate = () => {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  });
};

const getStartOfMonth = () => {
  const now = new Date();
  const mexicoDate = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
  );

  const year = mexicoDate.getFullYear();
  const month = String(mexicoDate.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
};

const fetchTable = async (
  supabaseUrl: string,
  serviceKey: string,
  path: string
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    return {
      error: true,
      status: response.status,
      path,
      detail: text,
      data: [],
    };
  }

  try {
    return {
      error: false,
      data: JSON.parse(text),
    };
  } catch {
    return {
      error: false,
      data: [],
    };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const { mensaje, usuario } = await req.json();

    const rol = usuario?.rol === "admin" ? "admin" : "user";

    if (!mensaje || typeof mensaje !== "string") {
      return jsonResponse({ error: "Falta el mensaje." }, 400);
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!OPENROUTER_API_KEY) {
      return jsonResponse({ error: "Falta OPENROUTER_API_KEY." }, 500);
    }

    if (!SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Falta SERVICE_ROLE_KEY." }, 500);
    }

    if (!SUPABASE_URL) {
      return jsonResponse({ error: "Falta SUPABASE_URL." }, 500);
    }

    const hoy = getMexicoDate();
    const inicioMes = getStartOfMonth();

    const produccionResult = await fetchTable(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      "produccion?select=*&order=fecha.desc&limit=100"
    );

    const productosResult = await fetchTable(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      "productos_manga?select=*&order=titulo.asc"
    );

    const inventarioResult = await fetchTable(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      "materia_prima?select=*&order=cantidad_disponible.asc"
    );

    const mermasResult = await fetchTable(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      "mermas_produccion?select=*&order=fecha.desc&limit=100"
    );

    const recetasResult = await fetchTable(
      SUPABASE_URL,
      SERVICE_ROLE_KEY,
      "producto_materiales?select=*&limit=200"
    );

    const erroresConsultas = [
      produccionResult,
      productosResult,
      inventarioResult,
      mermasResult,
      recetasResult,
    ].filter((r) => r.error);

    if (erroresConsultas.length > 0) {
      return jsonResponse(
        {
          error: "Error consultando Supabase.",
          detalles: erroresConsultas,
        },
        500
      );
    }

    const produccion = produccionResult.data || [];
    const productos = productosResult.data || [];
    const inventario = inventarioResult.data || [];
    const mermas = mermasResult.data || [];
    const recetas = recetasResult.data || [];

    const productosPorId = new Map(
      productos.map((p: any) => [Number(p.id), p])
    );

    const produccionHoy = produccion.filter((p: any) => p.fecha === hoy);
    const produccionMes = produccion.filter((p: any) => p.fecha >= inicioMes);

    const totalHoy = produccionHoy.reduce(
      (sum: number, p: any) => sum + Number(p.cantidad_producida || 0),
      0
    );

    const totalMes = produccionMes.reduce(
      (sum: number, p: any) => sum + Number(p.cantidad_producida || 0),
      0
    );

    const mermasMes = mermas.filter((m: any) => m.fecha >= inicioMes);

    const totalMermaMes = mermasMes.reduce(
      (sum: number, m: any) => sum + Number(m.cantidad_merma || 0),
      0
    );

    const ingresosMes = produccionMes.reduce((sum: number, p: any) => {
      const producto = productosPorId.get(Number(p.producto_id));
      const precio = Number(producto?.precio_venta || 0);
      return sum + Number(p.cantidad_producida || 0) * precio;
    }, 0);

    const produccionPorLinea = produccionMes.reduce((acc: any, p: any) => {
      const linea = p.linea_impresion || "Sin línea";
      acc[linea] = (acc[linea] || 0) + Number(p.cantidad_producida || 0);
      return acc;
    }, {});

    const produccionPorManga = produccionMes.reduce((acc: any, p: any) => {
      const producto = productosPorId.get(Number(p.producto_id));

      const nombre = producto
        ? `${producto.titulo} Vol. ${producto.volumen}`
        : `Producto ${p.producto_id}`;

      acc[nombre] = (acc[nombre] || 0) + Number(p.cantidad_producida || 0);
      return acc;
    }, {});

    const inventarioCritico = inventario.filter((m: any) => {
      return Number(m.cantidad_disponible || 0) <= Number(m.stock_minimo || 0);
    });

    const produccionesConTiempo = produccionMes.filter((p: any) => {
      return (
        Number(p.tiempo_estimado_horas || 0) > 0 &&
        Number(p.tiempo_real_horas || 0) > 0
      );
    });

    const eficienciaPromedio =
      produccionesConTiempo.length > 0
        ? produccionesConTiempo.reduce((sum: number, p: any) => {
            const estimado = Number(p.tiempo_estimado_horas || 0);
            const real = Number(p.tiempo_real_horas || 0);
            return sum + Math.min(100, (estimado / real) * 100);
          }, 0) / produccionesConTiempo.length
        : null;

    const productosRecientes = produccion
      .slice(0, 10)
      .map((p: any) => {
        const producto = productosPorId.get(Number(p.producto_id));

        return {
          fecha: p.fecha,
          producto: producto
            ? `${producto.titulo} Vol. ${producto.volumen}`
            : `Producto ${p.producto_id}`,
          cantidad: Number(p.cantidad_producida || 0),
          linea: p.linea_impresion || "Sin línea",
          estado: p.estado_produccion,
        };
      });

    const inventarioGeneral = inventario.map((m: any) => ({
      nombre: m.nombre,
      categoria: m.categoria,
      cantidad_disponible: Number(m.cantidad_disponible || 0),
      unidad: m.unidad,
      estado:
        Number(m.cantidad_disponible || 0) <= Number(m.stock_minimo || 0)
          ? "crítico"
          : "disponible",
    }));

    const resumenAdmin = {
      fecha_actual: hoy,
      inicio_mes: inicioMes,
      produccion_hoy: {
        total_unidades: totalHoy,
        lotes: produccionHoy.length,
        registros: produccionHoy,
      },
      produccion_mes: {
        total_unidades: totalMes,
        lotes: produccionMes.length,
        ingresos_estimados: ingresosMes,
        merma_total: totalMermaMes,
        eficiencia_promedio: eficienciaPromedio,
        por_linea: produccionPorLinea,
        por_manga: produccionPorManga,
      },
      inventario: {
        total_materiales: inventario.length,
        materiales_criticos: inventarioCritico,
        materiales: inventario,
      },
      productos_manga: productos,
      mermas_mes: mermasMes,
      recetas: recetas,
      ultimas_producciones: produccion.slice(0, 30),
    };

    const resumenUser = {
      fecha_actual: hoy,
      produccion_hoy: {
        total_unidades: totalHoy,
        lotes: produccionHoy.length,
        registros: produccionHoy.map((p: any) => {
          const producto = productosPorId.get(Number(p.producto_id));

          return {
            fecha: p.fecha,
            producto: producto
              ? `${producto.titulo} Vol. ${producto.volumen}`
              : `Producto ${p.producto_id}`,
            cantidad: Number(p.cantidad_producida || 0),
            linea: p.linea_impresion || "Sin línea",
            estado: p.estado_produccion,
          };
        }),
      },
      productos_recientes: productosRecientes,
      inventario_general: inventarioGeneral,
      resumen_operativo: {
        materiales_totales: inventario.length,
        materiales_criticos: inventarioCritico.length,
      },
    };

    const datosParaIA = rol === "admin" ? resumenAdmin : resumenUser;

    const permisosIA =
      rol === "admin"
        ? `
El usuario es ADMINISTRADOR.

Tiene acceso completo a:
- analítica avanzada
- producción
- inventario
- mermas
- eficiencia
- tendencias
- recomendaciones estratégicas
- consultas completas del ERP

Puede pedir recomendaciones, tendencias, alertas, cálculos e interpretación completa de los datos.
`
        : `
El usuario es USER NORMAL.

SOLO puede consultar:
- producción del día
- mangas producidos recientemente
- inventario general disponible
- resumen operativo reciente

NO puede consultar:
- analítica avanzada
- estrategias empresariales
- configuración
- usuarios
- datos sensibles
- recomendaciones administrativas
- ingresos estimados
- mermas detalladas
- eficiencia avanzada
- tendencias del mes

Si el usuario intenta acceder a información restringida,
responde exactamente:
"No tienes permisos para consultar esa información. Contacta al administrador."
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "MangaForge ERP",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: `
Eres el asistente inteligente de MangaForge ERP.

${permisosIA}

Reglas obligatorias:
- Responde siempre en español.
- No inventes datos, rutas ni módulos.
- Usa únicamente los datos reales del ERP incluidos abajo.
- Si no hay datos suficientes, dilo claramente.
- Si el usuario no tiene permisos para algo, no des rodeos: indica que no tiene permisos.
- No menciones que recibiste un JSON, solo responde de forma natural.

Datos reales permitidos para este usuario:
${JSON.stringify(datosParaIA)}
`,
            },
            {
              role: "user",
              content: mensaje,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse(
        {
          error: "Error desde OpenRouter.",
          detalle: data,
        },
        response.status
      );
    }

    const texto =
      data?.choices?.[0]?.message?.content || "No pude responder.";

    return jsonResponse({
      respuesta: texto,
      rol,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      500
    );
  }
});