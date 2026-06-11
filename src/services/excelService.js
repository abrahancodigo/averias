import ExcelJS from "exceljs";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const imagenABase64 = async (url) => {
  if (url.startsWith("data:")) return url;

  const response = await fetch(url, {
    mode: "cors",
    headers: { "Accept": "image/*" },
  });

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

export const exportarAveriasAExcel = async (averias) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sistema de Averias";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Averias", {
    properties: { defaultColWidth: 20 },
  });

  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };
  const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };

  sheet.columns = [
    { header: "Codigo", key: "codigo", width: 15 },
    { header: "Fecha", key: "fecha", width: 18 },
    { header: "Producto", key: "producto", width: 25 },
    { header: "Precio", key: "precio", width: 15 },
    { header: "Cantidad", key: "cantidad", width: 12 },
    { header: "Subtotal", key: "subtotal", width: 15 },
    { header: "Estado", key: "estado", width: 15 },
    { header: "Observaciones", key: "observaciones", width: 35 },
    { header: "Foto", key: "foto", width: 35 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF000000" } },
    };
  });
  sheet.getRow(1).height = 25;

  let rowIndex = 0;
  for (let i = 0; i < averias.length; i++) {
    const averia = averias[i];
    const items = obtenerItems(averia);
    const fechaFormatted = format(
      new Date(averia.created_at),
      "dd/MM/yyyy HH:mm",
      { locale: es }
    );

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

      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      });

      if (j === 0 && averia.fotos && averia.fotos.length > 0) {
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

          row.height = 120;
          sheet.addImage(imageId, {
            tl: { col: 8, row: rowIndex + 1 },
            ext: { width: 245, height: 120 },
            editAs: "oneCell",
          });
        } catch (e) {
          console.warn("Error al cargar imagen para Excel:", e);
        }
      }

      rowIndex++;
    }
  }

  sheet.autoFilter = {
    from: "A1",
    to: `I${rowIndex + 1}`,
  };

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
