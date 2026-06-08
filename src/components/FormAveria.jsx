import { useState, useRef, useEffect } from "react";
import { registrarAveria, actualizarAveria } from "../services/averiaService";
import { buscarProductos } from "../services/productoService";
import { compressImage } from "../utils/compressImage";

const vibrar = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

const ESTADOS = ["Averia", "Faltante", "Sobrante"];

const FormAveria = ({ averiaEditar, onCancelar }) => {
  const esEdicion = !!averiaEditar;

  const [formulario, setFormulario] = useState({
    codigo: "",
    producto: "",
    estado: "Averia",
    observaciones: "",
  });
  const [fotosBase64, setFotosBase64] = useState([]);
  const [fotosExistentes, setFotosExistentes] = useState([]);
  const [comprimiendo, setComprimiendo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const fileInputRef = useRef(null);

  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const busquedaRef = useRef(null);
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
        estado: averiaEditar.estado || "Averia",
        observaciones: averiaEditar.observaciones || "",
      });
      setFotosExistentes(averiaEditar.fotos || []);
    }
  }, [averiaEditar]);

  useEffect(() => {
    const manejarClicFuera = (e) => {
      if (busquedaRef.current && !busquedaRef.current.contains(e.target)) {
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
    const valor = e.target.value;
    setFormulario({ ...formulario, producto: valor });

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
    }, 300);
  };

  const seleccionarProducto = (producto) => {
    setFormulario({
      ...formulario,
      codigo: producto.codigo || formulario.codigo,
      producto: producto.nombre,
    });
    setMostrarSugerencias(false);
    setResultadosBusqueda([]);
  };

  const manejarFotos = async (e) => {
    const archivos = Array.from(e.target.files);
    const total = fotosExistentes.length + fotosBase64.length + archivos.length;
    if (total > 5) {
      setMensaje({ tipo: "error", texto: "Maximo 5 fotos" });
      return;
    }

    setComprimiendo(true);
    setMensaje(null);

    try {
      const comprimidas = await Promise.allSettled(archivos.map(compressImage));
      const exitosas = comprimidas
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      const fallidas = comprimidas.filter((r) => r.status === "rejected").length;

      if (exitosas.length > 0) {
        setFotosBase64((prev) => [...prev, ...exitosas]);
      }
      if (fallidas > 0) {
        setMensaje({
          tipo: "error",
          texto: `${fallidas} imagen(es) no pudieron comprimirse`,
        });
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error al comprimir imagenes" });
    } finally {
      setComprimiendo(false);
    }
  };

  const eliminarFotoNueva = (index) => {
    setFotosBase64((prev) => prev.filter((_, i) => i !== index));
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
      const todasFotos = [...fotosExistentes, ...fotosBase64];

      if (esEdicion) {
        await actualizarAveria(averiaEditar.id, formulario, todasFotos);
        vibrar(30);
        setMensaje({ tipo: "exito", texto: "Registro actualizado" });
      } else {
        await registrarAveria(formulario, todasFotos);
        vibrar(30);
        setMensaje({ tipo: "exito", texto: "Registro exitoso" });
      }

      setFormulario({ codigo: "", producto: "", estado: "Averia", observaciones: "" });
      setFotosBase64([]);
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

      <div className="campo">
        <label htmlFor="codigo">Codigo *</label>
        <input
          type="text"
          id="codigo"
          name="codigo"
          value={formulario.codigo}
          onChange={manejarCambio}
          placeholder="Ej: AVG-001"
          required
        />
      </div>

      <div className="campo" ref={busquedaRef}>
        <label htmlFor="producto">Producto *</label>
        <div className="busqueda-wrapper">
          <input
            type="text"
            id="producto"
            name="producto"
            value={formulario.producto}
            onChange={manejarBusqueda}
            onFocus={() => {
              if (resultadosBusqueda.length > 0) setMostrarSugerencias(true);
            }}
            placeholder="Buscar producto..."
            required
          />
          {buscando && <span className="buscando-indicator">...</span>}
        </div>
        {mostrarSugerencias && resultadosBusqueda.length > 0 && (
          <div className="sugerencias">
            {resultadosBusqueda.slice(0, 10).map((p) => (
              <button
                key={p.id}
                type="button"
                className="sugerencia-item"
                onClick={() => seleccionarProducto(p)}
              >
                <span className="sugerencia-codigo">{p.codigo}</span>
                <span className="sugerencia-nombre">{p.nombre}</span>
              </button>
            ))}
          </div>
        )}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={manejarFotos}
          style={{ display: "none" }}
        />

        {(fotosExistentes.length > 0 || fotosBase64.length > 0) && (
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
            {fotosBase64.map((src, i) => (
              <div key={`nw-${i}`} className="foto-preview">
                <img src={src} alt={`Nueva ${i + 1}`} />
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
          {cargando ? "Guardando..." : esEdicion ? "Actualizar" : "Registrar"}
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