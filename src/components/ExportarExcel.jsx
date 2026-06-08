import { useState } from "react";
import { obtenerAveriasPorFecha, obtenerAverias } from "../services/averiaService";
import { exportarAveriasAExcel } from "../services/excelService";

const vibrar = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

const ExportarExcel = () => {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [totalExportar, setTotalExportar] = useState(0);
  const [averiasFiltradas, setAveriasFiltradas] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  const buscarAverias = async () => {
    if (!fechaInicio || !fechaFin) {
      setMensaje({ tipo: "error", texto: "Selecciona ambas fechas" });
      return;
    }

    if (new Date(fechaInicio) > new Date(fechaFin)) {
      setMensaje({ tipo: "error", texto: "La fecha inicio debe ser anterior a la fecha fin" });
      return;
    }

    setCargando(true);
    setMensaje(null);
    try {
      const resultados = await obtenerAveriasPorFecha(fechaInicio, fechaFin);
      setAveriasFiltradas(resultados);
      setTotalExportar(resultados.length);
      if (resultados.length === 0) {
        setMensaje({ tipo: "error", texto: "No se encontraron registros en ese rango" });
      }
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "Error al buscar registros" });
    } finally {
      setCargando(false);
    }
  };

  const exportar = async () => {
    if (averiasFiltradas.length === 0) {
      setMensaje({ tipo: "error", texto: "No hay registros para exportar" });
      return;
    }

    setCargando(true);
    setMensaje(null);
    try {
      const fileName = await exportarAveriasAExcel(averiasFiltradas);
      vibrar(30);
      setMensaje({ tipo: "exito", texto: `Archivo exportado: ${fileName}` });
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "Error al exportar" });
    } finally {
      setCargando(false);
    }
  };

  const exportarTodo = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const todas = await obtenerAverias();
      if (todas.length === 0) {
        setMensaje({ tipo: "error", texto: "No hay registros para exportar" });
        setCargando(false);
        return;
      }
      const fileName = await exportarAveriasAExcel(todas);
      vibrar(30);
      setMensaje({ tipo: "exito", texto: `Archivo exportado: ${fileName}` });
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "Error al exportar" });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="exportar">
      <h2>Exportar a Excel</h2>

      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      <div className="rango-fechas">
        <div className="campo">
          <label htmlFor="fechaInicio">Fecha Inicio</label>
          <input
            type="date"
            id="fechaInicio"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
          />
        </div>
        <div className="campo">
          <label htmlFor="fechaFin">Fecha Fin</label>
          <input
            type="date"
            id="fechaFin"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>
      </div>

      <div className="botones-exportar">
        <button
          className="btn-buscar"
          onClick={buscarAverias}
          disabled={cargando}
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>

        {totalExportar > 0 && (
          <div className="resultado-busqueda">
            <p>
              Se encontraron <strong>{totalExportar}</strong> registros en el rango
              seleccionado.
            </p>
            <button
              className="btn-exportar"
              onClick={exportar}
              disabled={cargando}
            >
              Exportar Resultados
            </button>
          </div>
        )}
      </div>

      <div className="exportar-todo">
        <button
          className="btn-exportar-todo"
          onClick={exportarTodo}
          disabled={cargando}
        >
          Exportar Todos los Registros
        </button>
      </div>
    </div>
  );
};

export default ExportarExcel;