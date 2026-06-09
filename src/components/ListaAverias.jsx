import { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import VisorImagen from "./VisorImagen";
import { db } from "../config/firebase";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { vibrar } from "../utils/vibrar";

const PAGE_SIZE = 20;

const ListaAverias = ({ onEditar }) => {
  const [averias, setAverias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [imagenVisor, setImagenVisor] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const cargandoRef = useRef(false);

  const cargarAverias = useCallback(async (reset = true) => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setCargando(true);
    try {
      let q;
      if (reset) {
        q = query(
          collection(db, "averias"),
          orderBy("created_at", "desc"),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          collection(db, "averias"),
          orderBy("created_at", "desc"),
          startAfter(lastVisible),
          limit(PAGE_SIZE)
        );
      }

      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (reset) {
        setAverias(datos);
      } else {
        setAverias((prev) => [...prev, ...datos]);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHayMas(datos.length === PAGE_SIZE);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Error al cargar los registros");
    } finally {
      setCargando(false);
      cargandoRef.current = false;
    }
  }, [lastVisible]);

  useEffect(() => {
    cargarAverias(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manejarEliminar = async (id) => {
    vibrar(20);
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await deleteDoc(doc(db, "averias", id));
      vibrar(30);
      setAverias((prev) => prev.filter((a) => a.id !== id));
      setMensaje({ tipo: "exito", texto: "Registro eliminado" });
      setTimeout(() => setMensaje(null), 3000);
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "Error al eliminar" });
    }
  };

  if (cargando && averias.length === 0) return <div className="cargando">Cargando...</div>;

  return (
    <div className="lista">
      {error && <div className="mensaje mensaje-error">{error}</div>}
      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}
      {averias.length === 0 && !error ? (
        <div className="vacia">No hay registros</div>
      ) : (
        <>
          <h2>Registros ({averias.length})</h2>
          {averias.map((averia) => (
            <div key={averia.id} className="card-averia stagger-item">
              <div className="card-header">
                <span className="codigo">{averia.codigo}</span>
                <span
                  className={`estado estado-${averia.estado?.toLowerCase().replace(/\s/g, "-")}`}
                >
                  {averia.estado}
                </span>
              </div>
              <div className="card-body">
                <p>
                  <strong>Producto:</strong> {averia.producto}
                </p>
                {averia.observaciones && (
                  <p>
                    <strong>Observaciones:</strong> {averia.observaciones}
                  </p>
                )}
                <p className="fecha">
                  {averia.created_at
                    ? format(new Date(averia.created_at), "dd MMM yyyy, HH:mm", {
                        locale: es,
                      })
                    : "Sin fecha"}
                </p>
              </div>
              {averia.fotos && averia.fotos.length > 0 && (
                <div className="card-fotos">
                  {averia.fotos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Foto ${i + 1}`}
                      className="foto-averia"
                      onClick={() => setImagenVisor(src)}
                    />
                  ))}
                </div>
              )}
              <div className="card-footer">
                <button className="btn-editar" onClick={() => onEditar(averia)}>
                  Editar
                </button>
                <button className="btn-eliminar" onClick={() => manejarEliminar(averia.id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {hayMas && (
        <button
          className="btn-mas"
          onClick={() => cargarAverias(false)}
          disabled={cargando}
        >
          {cargando ? "Cargando..." : "Cargar mas registros"}
        </button>
      )}

      {imagenVisor && (
        <VisorImagen
          src={imagenVisor}
          onCerrar={() => setImagenVisor(null)}
        />
      )}
    </div>
  );
};

export default ListaAverias;
