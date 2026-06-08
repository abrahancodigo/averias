import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/firebase";

const vibrar = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

const Login = ({ onCrearCuenta }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mostrarRecuperar, setMostrarRecuperar] = useState(false);

  const manejarLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    setCargando(true);

    try {
      await login(email, password);
      vibrar(20);
    } catch (err) {
      console.error(err);
      vibrar(50);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Correo o contrasena incorrectos");
      } else if (err.code === "auth/too-many-requests") {
        setError("Demasiados intentos. Espera un momento");
      } else {
        setError("Error al iniciar sesion");
      }
    } finally {
      setCargando(false);
    }
  };

  const manejarRecuperar = async (e) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!email.trim()) {
      setError("Escribe tu correo para recuperar la contrasena");
      return;
    }

    setCargando(true);
    try {
      await sendPasswordResetEmail(auth, email);
      vibrar(30);
      setExito("Correo enviado. Revisa tu bandeja de entrada");
      setMostrarRecuperar(false);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-not-found") {
        setError("Si existe una cuenta con ese correo, recibiras un enlace");
      } else {
        setError("Error al enviar el correo");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sistema de Averias</h1>
          <p>Inicia sesion para continuar</p>
        </div>

        {!mostrarRecuperar ? (
          <form onSubmit={manejarLogin} className="login-form">
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
                  placeholder="Tu contrasena"
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
              {cargando ? "Entrando..." : "Iniciar Sesion"}
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setMostrarRecuperar(true);
                setError(null);
                setExito(null);
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>

            <button type="button" className="btn-link" onClick={onCrearCuenta}>
              ¿No tienes cuenta? Crear una
            </button>
          </form>
        ) : (
          <form onSubmit={manejarRecuperar} className="login-form">
            {error && <div className="mensaje mensaje-error">{error}</div>}
            {exito && <div className="mensaje mensaje-exito">{exito}</div>}

            <p className="recuperar-texto">
              Escribe tu correo y te enviaremos un enlace para restablecer tu
              contraseña.
            </p>

            <div className="campo">
              <label htmlFor="email-rec">Correo</label>
              <input
                type="email"
                id="email-rec"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </div>

            <button type="submit" className="btn-enviar" disabled={cargando}>
              {cargando ? "Enviando..." : "Enviar Correo"}
            </button>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setMostrarRecuperar(false);
                setError(null);
                setExito(null);
              }}
            >
              Volver al inicio de sesion
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;