import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";
import { crearUsuario } from "../services/userService";

const vibrar = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

const Signup = ({ onVolver }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [cargando, setCargando] = useState(false);

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!email.trim() || !password.trim()) {
      setError("Completa ambos campos");
      return;
    }
    if (password.length < 6) {
      setError("Minimo 6 caracteres");
      return;
    }

    setCargando(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await crearUsuario(userCredential.user.uid, email, "operador");
      vibrar(30);
      setExito(`Usuario ${email} creado. Ya puedes ir al login.`);
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      vibrar(50);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya esta registrado");
      } else if (err.code === "auth/weak-password") {
        setError("Contrasena muy debil (minimo 6 caracteres)");
      } else {
        setError("Error al crear usuario");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Crear Cuenta</h1>
          <p>Registra un nuevo usuario</p>
        </div>

        <form onSubmit={manejarSubmit} className="login-form">
          {error && <div className="mensaje mensaje-error">{error}</div>}
          {exito && <div className="mensaje mensaje-exito">{exito}</div>}

          <div className="campo">
            <label htmlFor="email">Correo</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="password">Contrasena</label>
            <div className="password-wrapper">
              <input
                type={verPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                required
              />
              <button
                type="button"
                className="btn-ojo"
                onClick={() => setVerPassword(!verPassword)}
                tabIndex={-1}
              >
                {verPassword ? "○" : "●"}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-enviar" disabled={cargando}>
            {cargando ? "Creando..." : "Crear Usuario"}
          </button>

          <button type="button" className="btn-link" onClick={onVolver}>
            Volver al inicio de sesion
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;