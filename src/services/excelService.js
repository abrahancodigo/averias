import ExcelJS from "exceljs";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const imagenABase64 = async (url) => {
  if (url.startsWith("data:")) return url;
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
    { header: "Estado", key: "estado", width: 15 },
    { header: "Observaciones", key: "observaciones", width: 35 },
    { header: "Foto", key: "foto", width: 30 },
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

  for (let i = 0; i < averias.length; i++) {
    const averia = averias[i];
    const fechaFormatted = format(
      new Date(averia.created_at),
      "dd/MM/yyyy HH:mm",
      { locale: es }
    );

    const rowData = {
      codigo: averia.codigo || "",
      fecha: fechaFormatted,
      producto: averia.producto || "",
      estado: averia.estado || "",
      observaciones: averia.observaciones || "",
      foto: "",
    };

    const row = sheet.addRow(rowData);
    row.alignment = { vertical: "middle", wrapText: true };

    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      };
    });

    if (averia.fotos && averia.fotos.length > 0) {
      try {
        const base64 = await imagenABase64(averia.fotos[0]);
        const imageId = workbook.addImage({
          base64: base64,
          extension: "jpeg",
        });

        row.height = 100;
        sheet.addImage(imageId, {
          tl: { col: 5, row: i + 1 },
          ext: { width: 120, height: 90 },
        });
      } catch (e) {
        console.warn("Error al cargar imagen para Excel:", e);
      }
    }
  }

  sheet.autoFilter = {
    from: "A1",
    to: `F${averias.length + 1}`,
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