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
          {averias.map((averia) => {
            const items = obtenerItems(averia);
            return (
              <div key={averia.id} className="card-averia stagger-item">
                <div className="card-header">
                  <span className="codigo">
                    {items.length === 1 ? items[0].codigo : `${items.length} productos`}
                  </span>
                  <span
                    className={`estado estado-${averia.estado?.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    {averia.estado}
                  </span>
                </div>
                <div className="card-body">
                  <div className="card-items">
                    {items.map((item, idx) => (
                      <div key={idx} className="card-item-fila">
                        <span className="card-item-codigo">{item.codigo}</span>
                        <span className="card-item-nombre">{item.producto}</span>
                        <span className="card-item-detalle">
                          {item.precio > 0 && formatPrice(item.precio)}
                          {item.cantidad > 1 && ` x${item.cantidad}`}
                        </span>
                      </div>
                    ))}
                  </div>
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
                        onClick={() => setImagenVisor({ fotos: averia.fotos, indice: i })}
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
            );
          })}
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
