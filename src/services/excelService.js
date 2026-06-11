import ExcelJS from "exceljs";
import { format } from "date-fns";

const imagenABase64 = async (url) => {
  if (url.startsWith("data:")) return url;

  const response = await fetch(url, { mode: "cors" });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const detectarExtension = (url, contentType) => {
  if (contentType && contentType.includes("png")) return "png";
  if (contentType && contentType.includes("webp")) return "webp";
  if (contentType && contentType.includes("gif")) return "gif";

  const urlLower = url.toLowerCase();
  if (urlLower.includes(".png")) return "png";
  if (urlLower.includes(".webp")) return "webp";
  if (urlLower.includes(".gif")) return "gif";
  return "jpeg";
};

const obtenerItems = (averia) => {
  if (averia.items && Array.isArray(averia.items)) {
    return averia.items;
  }
  if (averia.codigo) {
    return [{
      codigo: averia.codigo,
      producto: averia.producto,
      precio: averia.precio,
      cantidad: 1,
    }];
  }
  return [];
};

const FILA_ALTURA_BASE = 22;
const ALTO_IMAGEN_POR_FILA = 120;
const ANCHO_IMAGEN = 245;

export const exportarAveriasAExcel = async (averias) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Averias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Averias", {
    properties: { defaultColWidth: 18 },
  });

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

  const thickBorderBottom = {
    bottom: { style: "medium", color: { argb: "FF9CA3AF" } },
  };

  sheet.columns = [
    { header: "Codigo", key: "codigo", width: 15 },
    { header: "Fecha", key: "fecha", width: 14 },
    { header: "Producto", key: "producto", width: 28 },
    { header: "Precio", key: "precio", width: 14 },
    { header: "Cantidad", key: "cantidad", width: 11 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Observaciones", key: "observaciones", width: 35 },
    { header: "Foto", key: "foto", width: 30 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = headerBorder;
  });
  sheet.getRow(1).height = 28;

  let rowIndex = 0;
  let esGrupoPar = false;

  for (let i = 0; i < averias.length; i++) {
    const averia = averias[i];
    const items = obtenerItems(averia);
    const fechaFormatted = format(new Date(averia.created_at), "dd/MM/yyyy");

    const grupoInicio = rowIndex + 2;
    const grupoFin = grupoInicio + items.length - 1;

    for (let j = 0; j < items.length; j++) {
      const item = items[j];
      const precio = parseFloat(item.precio) || 0;
      const cantidad = parseInt(item.cantidad, 10) || 1;
      const subtotal = precio * cantidad;

      const rowData = {
        codigo: item.codigo || "",
        fecha: j === 0 ? fechaFormatted : "",
        producto: item.producto || "",
        precio: precio,
        cantidad: cantidad,
        subtotal: subtotal,
        estado: j === 0 ? (averia.estado || "") : "",
        observaciones: j === 0 ? (averia.observaciones || "") : "",
        foto: "",
      };

      const row = sheet.addRow(rowData);
      row.alignment = { vertical: "middle", wrapText: true };
      row.height = FILA_ALTURA_BASE;

      if (esGrupoPar) {
        row.eachCell((cell) => {
          cell.fill = evenFill;
        });
      }

      const esUltimaFilaGrupo = j === items.length - 1;
      row.eachCell((cell, colNumber) => {
        if (esUltimaFilaGrupo) {
          cell.border = {
            bottom: { style: "medium", color: { argb: "FFD1D5DB" } },
          };
        } else {
          cell.border = {
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          };
        }
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

    if (averia.fotos && averia.fotos.length > 0) {
      try {
        const url = averia.fotos[0];
        const response = await fetch(url, { mode: "cors" });
        const contentType = response.headers.get("content-type");
        const extension = detectarExtension(url, contentType);

        const base64 = await imagenABase64(url);
        const rawBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
        const imageId = workbook.addImage({
          base64: rawBase64,
          extension: extension,
        });

        const numFilas = items.length;
        const altoImagen = ALTO_IMAGEN_POR_FILA * numFilas;

        if (numFilas > 1) {
          for (let r = grupoInicio; r <= grupoFin; r++) {
            sheet.getRow(r).height = ALTO_IMAGEN_POR_FILA;
          }
          sheet.mergeCells(grupoInicio, 9, grupoFin, 9);
        } else {
          sheet.getRow(grupoInicio).height = ALTO_IMAGEN_POR_FILA;
        }

        const celdaFoto = sheet.getRow(grupoInicio).getCell(9);
        celdaFoto.alignment = { vertical: "middle", horizontal: "center" };

        sheet.addImage(imageId, {
          tl: { col: 8, row: grupoInicio - 1 },
          ext: { width: ANCHO_IMAGEN, height: altoImagen },
          editAs: "oneCell",
        });
      } catch (e) {
        console.warn("Error al cargar imagen para Excel:", e);
      }
    }

    esGrupoPar = !esGrupoPar;
  }

  sheet.autoFilter = {
    from: "A1",
    to: `I${rowIndex + 1}`,
  };

  sheet.views = [{ state: "frozen", ySplit: 1 }];

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
