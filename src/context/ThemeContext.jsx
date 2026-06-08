import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [modoOscuro, setModoOscuro] = useState(() => {
    try {
      return localStorage.getItem("modo-oscuro") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", modoOscuro ? "dark" : "light");
    try {
      localStorage.setItem("modo-oscuro", modoOscuro);
    } catch { }
  }, [modoOscuro]);

  const toggleModo = () => setModoOscuro((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ modoOscuro, toggleModo }}>
      {children}
    </ThemeContext.Provider>
  );
};
