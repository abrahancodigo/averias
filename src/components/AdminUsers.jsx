import { useState, useEffect, useCallback, useRef } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import {
  crearUsuario,
  eliminarUsuario,
  obtenerUsuariosPaginados,
  actualizarRol,
} from "../services/userService";
import { vibrar } from "../utils/vibrar";

const ROLES = ["admin", "operador", "visor"];

const AdminUsers = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [nuevoRol, setNuevoRol] = useState("operador");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hayMas, setHayMas] = useState(false);
  const cargandoRef = useRef(false);

  const cargarUsuarios = useCallback(async (reset = true) => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    try {
      const result = await obtenerUsuariosPaginados(
        reset ? null : lastVisible
      );
      if (reset) {
        setUsuarios(result.usuarios);
      } else {
        setUsuarios((prev) => [...prev, ...result.usuarios]);
      }
      setLastVisible(result.lastVisible);
      setHayMas(result.usuarios.length === 20);
    } catch (e) {
      console.error(e);
    } finally {
      setCargando(false);
      cargandoRef.current = false;
    }
  }, [lastVisible]);

  useEffect(() => {
    cargarUsuarios(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const crearUsuarioHandler = async (e) => {
    e.preventDefault();
    if (!nuevoEmail.trim() || !nuevaPassword.trim()) {
      setMensaje({ tipo: "error", texto: "Completa ambos campos" });
      return;
    }
    if (nuevaPassword.length < 6) {
      setMensaje({ tipo: "error", texto: "Minimo 6 caracteres" });
      return;
    }

    setCreando(true);
    setMensaje(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        nuevoEmail,
        nuevaPassword
      );
      const uid = userCredential.user.uid;
      await crearUsuario(uid, nuevoEmail, nuevoRol);

      setMensaje({ tipo: "exito", texto: `Usuario ${nuevoEmail} creado como ${nuevoRol}` });
      vibrar(30);
      setNuevoEmail("");
      setNuevaPassword("");
      setNuevoRol("operador");
      cargarUsuarios(true);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setMensaje({ tipo: "error", texto: "Este correo ya esta registrado" });
      } else if (err.code === "auth/weak-password") {
        setMensaje({ tipo: "error", texto: "Contrasena muy debil" });
      } else {
        setMensaje({ tipo: "error", texto: "Error al crear usuario" });
      }
    } finally {
      setCreando(false);
    }
  };

  const cambiarRol = async (id, email, nuevoRol) => {
    try {
      await actualizarRol(id, nuevoRol);
      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? { ...u, rol: nuevoRol } : u))
      );
      vibrar(20);
      setMensaje({ tipo: "exito", texto: `Rol de ${email} cambiado a ${nuevoRol}` });
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "Error al cambiar rol" });
    }
  };

  const eliminar = async (id, email) => {
    vibrar(20);
    if (!window.confirm(`Eliminar usuario ${email}?`)) return;
    try {
      await eliminarUsuario(id);
      vibrar(30);
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      setMensaje({
        tipo: "exito",
        texto: `${email} eliminado. La cuenta Auth debe eliminarse desde Firebase Console.`,
      });
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: "error", texto: "Error al eliminar" });
    }
  };

  if (cargando) return <div className="cargando">Cargando usuarios...</div>;

  return (
    <div className="admin-users">
      <h2>Gestionar Usuarios</h2>

      {mensaje && (
        <div className={`mensaje mensaje-${mensaje.tipo}`}>
          {mensaje.texto}
        </div>
      )}

      <form onSubmit={crearUsuarioHandler} className="form-crear-usuario">
        <div className="campo">
          <label htmlFor="email-nuevo">Correo</label>
          <input
            type="email"
            id="email-nuevo"
            value={nuevoEmail}
            onChange={(e) => setNuevoEmail(e.target.value)}
            placeholder="nuevo@correo.com"
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="password-nueva">Contrasena</label>
          <input
            type="password"
            id="password-nueva"
            value={nuevaPassword}
            onChange={(e) => setNuevaPassword(e.target.value)}
            placeholder="Minimo 6 caracteres"
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="rol-nuevo">Rol</label>
          <select
            id="rol-nuevo"
            value={nuevoRol}
            onChange={(e) => setNuevoRol(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-enviar" disabled={creando}>
          {creando ? "Creando..." : "Crear Usuario"}
        </button>
      </form>

      <div className="lista-usuarios">
        <h3>Usuarios ({usuarios.length})</h3>
        {usuarios.length === 0 ? (
          <p className="vacia">No hay usuarios registrados</p>
        ) : (
          usuarios.map((u) => (
            <div key={u.id} className="card-usuario">
              <div className="usuario-info">
                <span className="usuario-email">{u.email}</span>
                <select
                  className="select-rol"
                  value={u.rol}
                  onChange={(e) => cambiarRol(u.id, u.email, e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn-eliminar"
                onClick={() => eliminar(u.id, u.email)}
              >
                Eliminar
              </button>
            </div>
          ))
        )}
        {hayMas && (
          <button
            className="btn-mas"
            onClick={() => cargarUsuarios(false)}
          >
            Cargar mas
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
