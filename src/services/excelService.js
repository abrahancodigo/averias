import ExcelJS from "exceljs";
import { format } from "date-fns";

// ─────────────────────────────────────────────
// Helpers de imagen
// ─────────────────────────────────────────────

/** Convierte un Blob a data URI */
const blobADataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/**
 * Convierte cualquier data URI de imagen a JPEG usando Canvas.
 * Necesario porque ExcelJS no admite webp.
 */
const convertirAJpeg = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });

/** Detecta extensión a partir de content-type o URL */
const detectarExtension = (url = "", contentType = "") => {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  const lower = url.toLowerCase();
  if (lower.includes(".png")) return "png";
  if (lower.includes(".webp")) return "webp";
  if (lower.includes(".gif")) return "gif";
  return "jpeg";
};

/**
 * Descarga (o procesa) una imagen y devuelve { base64, extension }
 * listo para insertar en ExcelJS.
 * Soporta:
 *   - Data URIs (base64 directo, sin fetch)
 *   - URLs remotas (Firebase Storage, etc.)
 * Convierte automáticamente webp → jpeg porque ExcelJS no admite webp.
 */
const descargarImagen = async (url) => {
  // ── Caso 1: ya es un data URI ──────────────────────────────────────
  if (url.startsWith("data:")) {
    const match = url.match(/^data:image\/([\w+.-]+);base64,(.+)$/s);
    if (!match) throw new Error("Data URI con formato inválido");

    const mimeType = match[1]; // "jpeg", "png", "webp", etc.

    if (mimeType === "webp") {
      // Canvas: convertir webp → jpeg
      const jpegDataUrl = await convertirAJpeg(url);
      return { base64: jpegDataUrl.split(",")[1], extension: "jpeg" };
    }

    return {
      base64: match[2],
      extension: mimeType === "jpg" ? "jpeg" : mimeType,
    };
  }

  // ── Caso 2: URL remota ─────────────────────────────────────────────
  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) throw new Error(`HTTP ${response.status} al descargar imagen`);

  const contentType = response.headers.get("content-type") || "";
  const blob = await response.blob();
  const dataUrl = await blobADataUrl(blob);
  const extension = detectarExtension(url, contentType);

  if (extension === "webp") {
    const jpegDataUrl = await convertirAJpeg(dataUrl);
    return { base64: jpegDataUrl.split(",")[1], extension: "jpeg" };
  }

  return {
    base64: dataUrl.split(",")[1],
    extension,
  };
};

// ─────────────────────────────────────────────
// Helper de estructura de averías
// ─────────────────────────────────────────────

const obtenerItems = (averia) => {
  if (averia.items && Array.isArray(averia.items)) return averia.items;
  if (averia.codigo) {
    return [
      {
        codigo: averia.codigo,
        producto: averia.producto,
        precio: averia.precio,
        cantidad: 1,
      },
    ];
  }
  return [];
};

// ─────────────────────────────────────────────
// Constantes de layout
// ─────────────────────────────────────────────

const FILA_ALTURA_BASE = 22;          // altura normal sin imagen (puntos)
const FILA_ALTURA_CON_IMAGEN = 130;   // altura cuando hay imagen (puntos)
const IMAGEN_ANCHO = 230;             // ancho de la imagen en píxeles
const IMAGEN_MARGEN = 4;              // margen interno (EMU-offset en puntos equiv.)

// ─────────────────────────────────────────────
// Función principal de exportación
// ─────────────────────────────────────────────

export const exportarAveriasAExcel = async (averias) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Averias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Averias", {
    properties: { defaultColWidth: 18 },
  });

  // ── Estilos ──────────────────────────────────────────────────────
  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const headerBorder = {
    bottom: { style: "medium", color: { argb: "FF000000" } },
    top: { style: "medium", color: { argb: "FF000000" } },
  };
  const evenFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF8FAFC" },
  };

  // ── Columnas ─────────────────────────────────────────────────────
  sheet.columns = [
    { header: "Codigo",        key: "codigo",        width: 15 },
    { header: "Fecha",         key: "fecha",          width: 14 },
    { header: "Producto",      key: "producto",       width: 28 },
    { header: "Precio",        key: "precio",         width: 14 },
    { header: "Cantidad",      key: "cantidad",       width: 11 },
    { header: "Subtotal",      key: "subtotal",       width: 14 },
    { header: "Estado",        key: "estado",         width: 14 },
    { header: "Observaciones", key: "observaciones",  width: 35 },
    { header: "Foto",          key: "foto",           width: 32 },
  ];

  // Encabezado
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = headerBorder;
  });
  sheet.getRow(1).height = 28;

  // ── Filas de datos ───────────────────────────────────────────────
  let rowIndex = 0;
  let esGrupoPar = false;

  for (let i = 0; i < averias.length; i++) {
    const averia = averias[i];
    const items = obtenerItems(averia);
    const fechaFormatted = format(new Date(averia.created_at), "dd/MM/yyyy");

    const tieneImagen = averia.fotos && averia.fotos.length > 0;
    const numFilas = items.length;

    // fila base (1-indexed, offset de cabecera)
    const grupoInicio = rowIndex + 2;
    const grupoFin = grupoInicio + numFilas - 1;

    // ── Escribir filas del grupo ──────────────────────────────────
    for (let j = 0; j < numFilas; j++) {
      const item = items[j];
      const precio = parseFloat(item.precio) || 0;
      const cantidad = parseInt(item.cantidad, 10) || 1;
      const subtotal = precio * cantidad;

      const rowData = {
        codigo:        item.codigo || "",
        fecha:         j === 0 ? fechaFormatted : "",
        producto:      item.producto || "",
        precio,
        cantidad,
        subtotal,
        estado:        j === 0 ? (averia.estado || "") : "",
        observaciones: j === 0 ? (averia.observaciones || "") : "",
        foto:          "",
      };

      const row = sheet.addRow(rowData);
      row.alignment = { vertical: "middle", wrapText: true };
      row.height = tieneImagen ? FILA_ALTURA_CON_IMAGEN : FILA_ALTURA_BASE;

      if (esGrupoPar) {
        row.eachCell((cell) => { cell.fill = evenFill; });
      }

      const esUltima = j === numFilas - 1;
      row.eachCell((cell, colNumber) => {
        cell.border = esUltima
          ? { bottom: { style: "medium", color: { argb: "FFD1D5DB" } } }
          : { bottom: { style: "thin",   color: { argb: "FFE5E7EB" } } };

        if (colNumber === 4 || colNumber === 6) {
          cell.numFmt = '"$"#,##0.00';
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
        if (colNumber === 5) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });

      rowIndex++;
    }

    // ── Insertar imagen ───────────────────────────────────────────
    if (tieneImagen) {
      try {
        const { base64, extension } = await descargarImagen(averia.fotos[0]);

        const imageId = workbook.addImage({ base64, extension });

        // Combinar celdas de la columna Foto si hay múltiples filas
        if (numFilas > 1) {
          sheet.mergeCells(grupoInicio, 9, grupoFin, 9);
        }

        // Alinear la celda combinada al centro
        sheet.getRow(grupoInicio).getCell(9).alignment = {
          vertical: "middle",
          horizontal: "center",
        };

        // Alto total disponible para la imagen (en puntos, aprox 1 pt ≈ 1.33 px)
        const altoPuntos = FILA_ALTURA_CON_IMAGEN * numFilas;
        const altoPixeles = Math.round(altoPuntos * 1.33) - IMAGEN_MARGEN * 2;
        const anchoPixeles = IMAGEN_ANCHO;

        // tl = top-left de la imagen: col 8 (0-indexed) = columna I
        // Offset en EMUs (1 punto ≈ 12700 EMU) para margen interno
        const emuMargen = IMAGEN_MARGEN * 12700;

        sheet.addImage(imageId, {
          tl: {
            col: 8,
            row: grupoInicio - 1,
            nativeColOff: emuMargen,
            nativeRowOff: emuMargen,
          },
          ext: {
            width: anchoPixeles,
            height: altoPixeles,
          },
          editAs: "oneCell",
        });
      } catch (err) {
        console.error(
          `[excelService] Error al insertar imagen para avería ${averia.id}:`,
          err
        );
        // Fallback: escribir texto en la celda para que el usuario sepa que falló
        const celdaFoto = sheet.getRow(grupoInicio).getCell(9);
        celdaFoto.value = "⚠ Sin foto";
        celdaFoto.font = { italic: true, color: { argb: "FF9CA3AF" } };
      }
    }

    esGrupoPar = !esGrupoPar;
  }

  // ── Filtros y vista ───────────────────────────────────────────────
  sheet.autoFilter = {
    from: "A1",
    to: `I${rowIndex + 1}`,
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  // ── Generar y descargar archivo ───────────────────────────────────
  const fileName = `averias_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);

  return fileName;
};
