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
import { formatPrice } from "../utils/formatPrice";

const ESTADOS = ["Averia", "Faltante", "Sobrante"];

const FormAveria = ({ averiaEditar, onCancelar }) => {
  const esEdicion = !!averiaEditar;

  const [formulario, setFormulario] = useState({
    codigo: "",
    producto: "",
    precio: "",
    estado: "Averia",
    observaciones: "",
  });
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
  const [campoBusquedaActivo, setCampoBusquedaActivo] = useState(null);
  const busquedaCodigoRef = useRef(null);
  const busquedaProductoRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (averiaEditar) {
      setFormulario({
        codigo: averiaEditar.codigo || "",
        producto: averiaEditar.producto || "",
        precio: averiaEditar.precio || "",
        estado: averiaEditar.estado || "Averia",
        observaciones: averiaEditar.observaciones || "",
      });
      setFotosExistentes(averiaEditar.fotos || []);
    }
  }, [averiaEditar]);

  useEffect(() => {
    const manejarClicFuera = (e) => {
      const enCodigo = busquedaCodigoRef.current && busquedaCodigoRef.current.contains(e.target);
      const enProducto = busquedaProductoRef.current && busquedaProductoRef.current.contains(e.target);
      if (!enCodigo && !enProducto) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, []);

  const manejarCambio = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const manejarBusqueda = (e) => {
    const { name, value } = e.target;
    setFormulario({ ...formulario, [name]: value });
    setCampoBusquedaActivo(name);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResultadosBusqueda([]);
      setMostrarSugerencias(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const resultados = await buscarProductos(value);
        setResultadosBusqueda(resultados);
        setMostrarSugerencias(resultados.length > 0);
      } catch (err) {
        console.error(err);
      } finally {
        setBuscando(false);
      }
    }, 150);
  };

  const seleccionarProducto = (producto) => {
    setFormulario({
      ...formulario,
      codigo: producto.codigo || "",
      producto: producto.nombre || "",
      precio: producto.precio || "",
    });
    setMostrarSugerencias(false);
    setResultadosBusqueda([]);
    setCampoBusquedaActivo(null);
  };

  const renderSugerencias = (campo) => {
    if (!mostrarSugerencias || campoBusquedaActivo !== campo) return null;

    if (resultadosBusqueda.length === 0 && formulario[campo].trim().length >= 2) {
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
            onClick={() => seleccionarProducto(p)}
          >
            <div className="sugerencia-info">
              <span className="sugerencia-codigo">{p.codigo}</span>
              <span className="sugerencia-nombre">{p.nombre}</span>
            </div>
            {p.precio > 0 && (
              <span className="sugerencia-precio">{formatPrice(p.precio)}</span>
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

    if (!formulario.codigo.trim()) {
      setMensaje({ tipo: "error", texto: "El codigo es obligatorio" });
      return;
    }
    if (!formulario.producto.trim()) {
      setMensaje({ tipo: "error", texto: "El producto es obligatorio" });
      return;
    }

    setCargando(true);
    setMensaje(null);

    try {
      let idAveria;

      if (esEdicion) {
        idAveria = averiaEditar.id;

        const blobsNuevos = fotosComprimidas.map((f) => f.blob);
        let urlsNuevas = [];
        if (blobsNuevos.length > 0) {
          urlsNuevas = await subirMultiplesImagenes(idAveria, blobsNuevos);
        }

        const todasLasUrls = [...fotosExistentes, ...urlsNuevas];
        await actualizarAveria(idAveria, formulario, todasLasUrls);
        vibrar(30);
        setMensaje({ tipo: "exito", texto: "Registro actualizado" });
      } else {
        const existente = await obtenerProductoPorCodigo(formulario.codigo.trim());
        if (!existente) {
          await agregarProducto({
            codigo: formulario.codigo.trim(),
            nombre: formulario.producto.trim(),
            precio: parseFloat(formulario.precio) || 0,
          });
        }

        idAveria = await registrarAveria(formulario, []);

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

      setFormulario({ codigo: "", producto: "", precio: "", estado: "Averia", observaciones: "" });
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

      <div className="campo" ref={busquedaCodigoRef}>
        <label htmlFor="codigo">Codigo *</label>
        <div className="busqueda-wrapper">
          <input
            type="text"
            id="codigo"
            name="codigo"
            value={formulario.codigo}
            onChange={manejarBusqueda}
            onFocus={() => {
              if (resultadosBusqueda.length > 0 && campoBusquedaActivo === "codigo") {
                setMostrarSugerencias(true);
              }
            }}
            placeholder="Ej: AVG-001"
            required
          />
          {buscando && campoBusquedaActivo === "codigo" && (
            <span className="buscando-indicator">...</span>
          )}
        </div>
        {renderSugerencias("codigo")}
      </div>

      <div className="campo" ref={busquedaProductoRef}>
        <label htmlFor="producto">Producto *</label>
        <div className="busqueda-wrapper">
          <input
            type="text"
            id="producto"
            name="producto"
            value={formulario.producto}
            onChange={manejarBusqueda}
            onFocus={() => {
              if (resultadosBusqueda.length > 0 && campoBusquedaActivo === "producto") {
                setMostrarSugerencias(true);
              }
            }}
            placeholder="Buscar producto..."
            required
          />
          {buscando && campoBusquedaActivo === "producto" && (
            <span className="buscando-indicator">...</span>
          )}
        </div>
        {renderSugerencias("producto")}
      </div>

      <div className="campo">
        <label htmlFor="precio">Precio</label>
        <input
          type="number"
          id="precio"
          name="precio"
          value={formulario.precio}
          onChange={manejarCambio}
          placeholder="0.00"
          step="0.01"
          min="0"
        />
      </div>

      <div className="campo">
        <label htmlFor="estado">Estado</label>
        <select
          id="estado"
          name="estado"
          value={formulario.estado}
          onChange={manejarCambio}
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
          name="observaciones"
          value={formulario.observaciones}
          onChange={manejarCambio}
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
