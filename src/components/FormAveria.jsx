import { useState, useRef, useEffect } from "react";
import { registrarAveria, actualizarAveria } from "../services/averiaService";
import {
  buscarProductos,
  agregarProducto,
  obtenerProductoPorCodigo,
} from "../services/productoService";
import { subirMultiplesImagenes } from "../services/imageService";
import { compressImage } from "../utils/compressImage";
import { vibrar } from "../utils/vibrar";

const ESTADOS = ["Averia", "Faltante", "Sobrante"];

const itemVacio = () => ({ codigo: "", producto: "", precio: "", cantidad: 1 });

const FormAveria = ({ averiaEditar, onCancelar }) => {
  const esEdicion = !!averiaEditar;

  const [items, setItems] = useState([itemVacio()]);
  const [estado, setEstado] = useState("Averia");
  const [observaciones, setObservaciones] = useState("");
  const [fotosComprimidas, setFotosComprimidas] = useState([]);
  const [fotosExistentes, setFotosExistentes] = useState([]);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const fileInputRef = useRef(null);

  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [itemBusquedaActivo, setItemBusquedaActivo] = useState(null);
  const [campoBusquedaActivo, setCampoBusquedaActivo] = useState(null);
  const busquedaRefs = useRef([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (averiaEditar) {
      if (averiaEditar.items && Array.isArray(averiaEditar.items)) {
        setItems(averiaEditar.items.map((it) => ({
          codigo: it.codigo || "",
          producto: it.producto || "",
          precio: it.precio ?? "",
          cantidad: it.cantidad ?? 1,
        })));
      } else if (averiaEditar.codigo) {
        setItems([{
          codigo: averiaEditar.codigo || "",
          producto: averiaEditar.producto || "",
          precio: averiaEditar.precio ?? "",
          cantidad: 1,
        }]);
      }
      setEstado(averiaEditar.estado || "Averia");
      setObservaciones(averiaEditar.observaciones || "");
      setFotosExistentes(averiaEditar.fotos || []);
    }
  }, [averiaEditar]);

  useEffect(() => {
    const manejarClicFuera = (e) => {
      const refs = busquedaRefs.current || [];
      const dentroDeAlguno = refs.some((ref) => ref && ref.contains(e.target));
      if (!dentroDeAlguno) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, []);

  const actualizarItem = (index, campo, valor) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [campo]: valor } : it));
  };

  const agregarItem = () => {
    setItems((prev) => [...prev, itemVacio()]);
    vibrar(15);
  };

  const eliminarItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
    vibrar(15);
  };

  const manejarBusqueda = (index, campo, valor) => {
    actualizarItem(index, campo, valor);
    setItemBusquedaActivo(index);
    setCampoBusquedaActivo(campo);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (valor.trim().length < 2) {
      setResultadosBusqueda([]);
      setMostrarSugerencias(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const resultados = await buscarProductos(valor);
        setResultadosBusqueda(resultados);
        setMostrarSugerencias(resultados.length > 0);
      } catch (err) {
        console.error(err);
      } finally {
        setBuscando(false);
      }
    }, 150);
  };

  const seleccionarProducto = (index, producto) => {
    setItems((prev) => prev.map((it, i) => i === index ? {
      ...it,
      codigo: producto.codigo || "",
      producto: producto.nombre || "",
      precio: producto.precio ?? "",
    } : it));
    setMostrarSugerencias(false);
    setResultadosBusqueda([]);
    setItemBusquedaActivo(null);
    setCampoBusquedaActivo(null);
  };

  const renderSugerencias = (index, campo) => {
    if (!mostrarSugerencias || itemBusquedaActivo !== index || campoBusquedaActivo !== campo) return null;

    const valorActual = items[index]?.[campo] || "";

    if (resultadosBusqueda.length === 0 && valorActual.trim().length >= 2) {
      return (
        <div className="sugerencias">
          <div className="sugerencia-vacia">Sin resultados</div>
        </div>
      );
    }

    if (resultadosBusqueda.length === 0) return null;

    return (
      <div className="sugerencias">
        {resultadosBusqueda.slice(0, 10).map((p) => (
          <button
            key={p.id}
            type="button"
            className="sugerencia-item"
            onClick={() => seleccionarProducto(index, p)}
          >
            <div className="sugerencia-info">
              <span className="sugerencia-codigo">{p.codigo}</span>
              <span className="sugerencia-nombre">{p.nombre}</span>
            </div>
            {p.precio > 0 && (
              <span className="sugerencia-precio">${parseFloat(p.precio).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const manejarFotos = async (e) => {
    const archivos = Array.from(e.target.files);
    const total = fotosExistentes.length + fotosComprimidas.length + archivos.length;
    if (total > 5) {
      setMensaje({ tipo: "error", texto: "Maximo 5 fotos" });
      return;
    }

    setComprimiendo(true);
    setCompressionProgress(0);
    setMensaje(null);

    const exitosas = [];
    let fallidas = 0;
    const totalArchivos = archivos.length;

    for (let i = 0; i < archivos.length; i++) {
      try {
        const result = await compressImage(archivos[i]);
        exitosas.push(result);
      } catch {
        fallidas++;
      }
      setCompressionProgress(Math.round(((i + 1) / totalArchivos) * 100));
    }

    if (exitosas.length > 0) {
      setFotosComprimidas((prev) => [...prev, ...exitosas]);
    }
    if (fallidas > 0) {
      setMensaje({
        tipo: "error",
        texto: `${fallidas} imagen(es) no pudieron comprimirse`,
      });
    }
    setComprimiendo(false);
    setTimeout(() => setCompressionProgress(0), 800);
  };

  const eliminarFotoNueva = (index) => {
    setFotosComprimidas((prev) => prev.filter((_, i) => i !== index));
  };

  const eliminarFotoExistente = (index) => {
    setFotosExistentes((prev) => prev.filter((_, i) => i !== index));
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    const itemsValidos = items.filter((it) => it.codigo.trim() && it.producto.trim());
    if (itemsValidos.length === 0) {
      setMensaje({ tipo: "error", texto: "Agrega al menos un producto con codigo y nombre" });
      return;
    }

    setCargando(true);
    setMensaje(null);

    try {
      let idAveria;
      const dataAveria = { items: itemsValidos, estado, observaciones };

      if (esEdicion) {
        idAveria = averiaEditar.id;

        const blobsNuevos = fotosComprimidas.map((f) => f.blob);
        let urlsNuevas = [];
        if (blobsNuevos.length > 0) {
          urlsNuevas = await subirMultiplesImagenes(idAveria, blobsNuevos);
        }

        const todasLasUrls = [...fotosExistentes, ...urlsNuevas];
        await actualizarAveria(idAveria, dataAveria, todasLasUrls);
        vibrar(30);
        setMensaje({ tipo: "exito", texto: "Registro actualizado" });
      } else {
        for (const item of itemsValidos) {
          const existente = await obtenerProductoPorCodigo(item.codigo.trim());
          if (!existente) {
            await agregarProducto({
              codigo: item.codigo.trim(),
              nombre: item.producto.trim(),
              precio: parseFloat(item.precio) || 0,
            });
          }
        }

        idAveria = await registrarAveria(dataAveria, []);

        const blobsNuevos = fotosComprimidas.map((f) => f.blob);
        if (blobsNuevos.length > 0) {
          const urls = await subirMultiplesImagenes(idAveria, blobsNuevos);
          const { doc, updateDoc } = await import("firebase/firestore");
          const { db } = await import("../config/firebase");
          await updateDoc(doc(db, "averias", idAveria), { fotos: urls });
        }

        vibrar(30);
        setMensaje({ tipo: "exito", texto: "Registro exitoso" });
      }

      setItems([itemVacio()]);
      setEstado("Averia");
      setObservaciones("");
      setFotosComprimidas([]);
      setFotosExistentes([]);
      setResultadosBusqueda([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      let errorMsg = "Error al guardar";
      if (error.code === "permission-denied") {
        errorMsg = "No tienes permiso.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      setMensaje({ tipo: "error", texto: errorMsg });
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={manejarSubmit} className="formulario">
      <h2>{esEdicion ? "Editar Registro" : "Registrar"}</h2>

      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`}>{mensaje.texto}</div>
      )}

      <div className="items-container">
        {items.map((item, index) => (
          <div key={index} className="item-row">
            <div className="item-header">
              <span className="item-num">#{index + 1}</span>
              {items.length > 1 && (
                <button
                  type="button"
                  className="btn-eliminar-item"
                  onClick={() => eliminarItem(index)}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="campo" ref={(el) => { busquedaRefs.current[index] = el; }}>
              <label>Codigo *</label>
              <div className="busqueda-wrapper">
                <input
                  type="text"
                  value={item.codigo}
                  onChange={(e) => manejarBusqueda(index, "codigo", e.target.value)}
                  onFocus={() => {
                    if (resultadosBusqueda.length > 0 && itemBusquedaActivo === index && campoBusquedaActivo === "codigo") {
                      setMostrarSugerencias(true);
                    }
                  }}
                  placeholder="Ej: AVG-001"
                  required
                />
                {buscando && itemBusquedaActivo === index && campoBusquedaActivo === "codigo" && (
                  <span className="buscando-indicator">...</span>
                )}
              </div>
              {renderSugerencias(index, "codigo")}
            </div>

            <div className="campo" ref={(el) => { busquedaRefs.current[index + "_prod"] = el; }}>
              <label>Producto *</label>
              <div className="busqueda-wrapper">
                <input
                  type="text"
                  value={item.producto}
                  onChange={(e) => manejarBusqueda(index, "producto", e.target.value)}
                  onFocus={() => {
                    if (resultadosBusqueda.length > 0 && itemBusquedaActivo === index && campoBusquedaActivo === "producto") {
                      setMostrarSugerencias(true);
                    }
                  }}
                  placeholder="Buscar producto..."
                  required
                />
                {buscando && itemBusquedaActivo === index && campoBusquedaActivo === "producto" && (
                  <span className="buscando-indicator">...</span>
                )}
              </div>
              {renderSugerencias(index, "producto")}
            </div>

            <div className="item-cantidad-precio">
              <div className="campo">
                <label>Precio</label>
                <input
                  type="number"
                  value={item.precio}
                  onChange={(e) => actualizarItem(index, "precio", e.target.value)}
                  placeholder="0"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="campo">
                <label>Cantidad</label>
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={(e) => actualizarItem(index, "cantidad", e.target.value)}
                  min="1"
                  step="1"
                />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="btn-agregar-item" onClick={agregarItem}>
          + Agregar producto
        </button>
      </div>

      <div className="campo">
        <label htmlFor="estado">Estado</label>
        <select
          id="estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="observaciones">Observaciones</label>
        <textarea
          id="observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          placeholder="Notas adicionales"
          rows="2"
        />
      </div>

      <div className="campo-fotos">
        <label>Fotos (max. 5)</label>
        <div className="botones-foto">
          <button
            type="button"
            className="btn-foto"
            onClick={() => fileInputRef.current?.click()}
          >
            {comprimiendo ? "Comprimiendo..." : "Tomar Foto"}
          </button>
          <button
            type="button"
            className="btn-foto btn-foto-secondary"
            onClick={() => {
              fileInputRef.current.removeAttribute("capture");
              fileInputRef.current?.click();
            }}
          >
            Subir Foto
          </button>
          </div>
          {compressionProgress > 0 && (
            <div className="progress-bar">
              <div className="progress" style={{ width: `${compressionProgress}%` }} />
            </div>
          )}
          <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={manejarFotos}
          style={{ display: "none" }}
        />

        {(fotosExistentes.length > 0 || fotosComprimidas.length > 0) && (
          <div className="galeria">
            {fotosExistentes.map((src, i) => (
              <div key={`ex-${i}`} className="foto-preview">
                <img src={src} alt={`Foto ${i + 1}`} />
                <button
                  type="button"
                  className="btn-eliminar-foto"
                  onClick={() => eliminarFotoExistente(i)}
                >
                  X
                </button>
              </div>
            ))}
            {fotosComprimidas.map((foto, i) => (
              <div key={`nw-${i}`} className="foto-preview">
                <img src={foto.preview} alt={`Nueva ${i + 1}`} />
                <button
                  type="button"
                  className="btn-eliminar-foto"
                  onClick={() => eliminarFotoNueva(i)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="botones-form">
        <button type="submit" className="btn-enviar" disabled={cargando || comprimiendo}>
          {cargando ? "Subiendo..." : esEdicion ? "Actualizar" : "Registrar"}
        </button>
        {esEdicion && (
          <button type="button" className="btn-cancelar" onClick={onCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};

export default FormAveria;
