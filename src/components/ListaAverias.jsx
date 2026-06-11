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
import { formatPrice } from "../utils/formatPrice";

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
          <div className="tabla-scroll">
            <table className="tabla-averias">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Fecha</th>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                  <th>Fotos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {averias.map((averia) => (
                  <tr key={averia.id}>
                    <td><strong>{averia.codigo}</strong></td>
                    <td>
                      {averia.created_at
                        ? format(new Date(averia.created_at), "dd MMM yyyy, HH:mm", { locale: es })
                        : "Sin fecha"}
                    </td>
                    <td>{averia.producto}</td>
                    <td>{averia.precio > 0 ? formatPrice(averia.precio) : "-"}</td>
                    <td>
                      <span className={`estado estado-${averia.estado?.toLowerCase().replace(/\s/g, "-")}`}>
                        {averia.estado}
                      </span>
                    </td>
                    <td className="obs-celda">{averia.observaciones || "-"}</td>
                    <td>
                      <div className="fotos-mini">
                        {averia.fotos && averia.fotos.length > 0 ? (
                          averia.fotos.map((src, i) => (
                            <img
                              key={i}
                              src={src}
                              alt={`Foto ${i + 1}`}
                              className="foto-mini"
                              onClick={() => setImagenVisor({ fotos: averia.fotos, indice: i })}
                            />
                          ))
                        ) : (
                          <span className="sin-foto">Sin foto</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="acciones-tabla">
                        <button className="btn-editar-sm" onClick={() => onEditar(averia)}>
                          Editar
                        </button>
                        <button className="btn-eliminar-sm" onClick={() => manejarEliminar(averia.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          fotos={imagenVisor.fotos}
          indiceInicial={imagenVisor.indice}
          onCerrar={() => setImagenVisor(null)}
        />
      )}
    </div>
  );
};

export default ListaAverias;
