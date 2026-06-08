import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { obtenerUsuarioPorUid } from "../services/userService";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [rol, setRol] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const perfil = await obtenerUsuarioPorUid(user.uid);
        setUsuario(user);
        setRol(perfil?.rol || "operador");
      } else {
        setUsuario(null);
        setRol(null);
      }
      setCargando(false);
    });
    return unsubscribe;
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  if (cargando) return <div className="cargando">Cargando...</div>;

  return (
    <AuthContext.Provider value={{ usuario, rol, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};