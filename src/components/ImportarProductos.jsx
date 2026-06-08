import { useState, useRef } from "react";
import ExcelJS from "exceljs";
import { agregarProductos, eliminarProductos, obtenerProductos } from "../services/productoService";

const vibrar = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

const ImportarProductos = () => {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const fileRef = useRef(null);

  const leerArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMensaje({ tipo: "error", texto: "El archivo es muy grande (max 5MB)" });
      return;
    }

    setCargando(true);
    setMensaje(null);
    setProductos([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet || sheet.rowCount < 2) {
        setMensaje({ tipo: "error", texto: "El archivo no tiene datos" });
        setCargando(false);
        return;
      }

      const headers = [];
      sheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString().toLowerCase().trim() || "";
      });

      let codigoCol = headers.findIndex(
        (h) => h.includes("codigo") || h.includes("barcode") || h.includes("code") || h.includes("sku")
      );
      let nombreCol = headers.findIndex(
        (h) => h.includes("nombre") || h.includes("producto") || h.includes("name") || h.includes("product") || h.includes("descripcion")
      );
      let precioCol = headers.findIndex(
        (h) => h.includes("precio") || h.includes("price") || h.includes("costo") || h.includes("cost")
      );

      if (codigoCol === -1) codigoCol = 1;
      if (nombreCol === -1) nombreCol = 2;

      const lista = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const codigo = row.getCell(codigoCol).value?.toString().trim() || "";
        const nombre = row.getCell(nombreCol).value?.toString().trim() || "";
        const precioRaw = row.getCell(precioCol).value;
        const precio = precioRaw ? parseFloat(precioRaw) || 0 : 0;
        if (codigo || nombre) {
          lista.push({ codigo, nombre, precio });
        }
      });

      setProductos(lista);
      setMensaje({ tipo: "exito", texto: `${lista.length} productos encontrados` });
      vibrar(20);
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al leer el archivo" });
    } finally {
      setCargando(false);
    }
  };

  const guardar = async () => {
    if (productos.length === 0) return;
    setCargando(true);
    setMensaje(null);

    try {
      const existentes = await obtenerProductos();
      const codigosExistentes = new Set(existentes.map((p) => p.codigo));
      const nuevos = productos.filter((p) => !codigosExistentes.has(p.codigo));

      if (nuevos.length === 0) {
        setMensaje({ tipo: "error", texto: "Todos los productos ya existen" });
        setCargando(false);
        return;
      }

      await agregarProductos(nuevos);
      const omitidos = productos.length - nuevos.length;
      setMensaje({
        tipo: "exito",
        texto: `${nuevos.length} guardados${omitidos > 0 ? ` (${omitidos} duplicados omitidos)` : ""}`,
      });
      setProductos([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al guardar" });
    } finally {
      setCargando(false);
    }
  };

  const limpiar = async () => {
    if (!window.confirm("Eliminar todos los productos de la base de datos?")) return;
    setCargando(true);
    try {
      const eliminados = await eliminarProductos();
      setMensaje({ tipo: "exito", texto: `${eliminados} productos eliminados` });
      vibrar(30);
    } catch (err) {
      console.error(err);
      setMensaje({ tipo: "error", texto: "Error al eliminar" });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="importar-productos">
      <h2>Base de Productos</h2>

      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      <div className="campo">
        <label>Subir archivo Excel (.xlsx)</label>
        <p className="ayuda-texto">
          Columnas esperadas (encabezados exactos): <strong>Codigo</strong>, <strong>Nombre</strong> y <strong>Precio</strong>.
          El precio debe ser numérico; si se omite se guardará como 0.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={leerArchivo}
          disabled={cargando}
        />
      </div>

      {productos.length > 0 && (
        <div className="vista-previa-productos">
          <p className="contador">{productos.length} productos para guardar</p>
          <div className="tabla-scroll">
            <table className="tabla-productos">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Nombre</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {productos.slice(0, 50).map((p, i) => (
                  <tr key={i}>
                    <td>{p.codigo}</td>
                    <td>{p.nombre}</td>
                    <td>{p.precio != null ? p.precio : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productos.length > 50 && (
              <p className="mas-resultos">... y {productos.length - 50} mas</p>
            )}
          </div>
          <button className="btn-enviar" onClick={guardar} disabled={cargando}>
            {cargando ? "Guardando..." : "Guardar en Base de Datos"}
          </button>
        </div>
      )}

      <div className="acciones-base">
        <button className="btn-secundario" onClick={limpiar} disabled={cargando}>
          Limpiar Base de Datos
        </button>
      </div>
    </div>
  );
};

export default ImportarProductos;