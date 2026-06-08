import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Signup from "./components/Signup";
import FormAveria from "./components/FormAveria";
import ListaAverias from "./components/ListaAverias";
import ExportarExcel from "./components/ExportarExcel";
import AdminUsers from "./components/AdminUsers";
import ImportarProductos from "./components/ImportarProductos";
import ToggleTema from "./components/ToggleTema";
import { useSwipeNavigation } from "./hooks/useSwipeNavigation";
import "./App.css";

const Icono = ({ tipo }) => {
  const size = 26;

  const iconos = {
    registrar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
    ),
    listado: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    exportar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 18 15 15" />
      </svg>
    ),
    productos: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    usuarios: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  };

  return iconos[tipo] || null;
};

// Iconos para el menú lateral (hamburguesa)
const MenuIcono = ({ tipo }) => {
  const size = 22;
  const iconos = {
    productos: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    usuarios: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    exportar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <polyline points="9 15 12 18 15 15" />
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
  };
  return iconos[tipo] || null;
};

const vibrar = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

const TABS_OPERADOR = [
  { id: "registrar", label: "Registrar", icono: "registrar" },
  { id: "listado", label: "Inventario", icono: "listado" },
  { id: "exportar", label: "Exportar", icono: "exportar" },
];

const TABS_ADMIN = [
  ...TABS_OPERADOR,
  { id: "productos", label: "Productos", icono: "productos" },
  { id: "usuarios", label: "Usuarios", icono: "usuarios" },
];

// Componente del botón hamburguesa con animación morphing avanzada
const HamburgerButton = ({ isOpen, onClick }) => {
  return (
    <button
      className="btn-hamburger"
      onClick={onClick}
      aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={isOpen}
    >
      <span className={`hamburger-lines ${isOpen ? "open" : ""}`}>
        <span className="line top" />
        <span className="line middle" />
        <span className="line bottom" />
      </span>
      <span className="hamburger-glow" />
    </button>
  );
};

// Componente del menú lateral premium
const SideMenu = ({
  isOpen,
  onClose,
  usuario,
  rol,
  onNavigate,
  onLogout
}) => {
  const menuItemsRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const menuItems = [
    { id: "productos", label: "Base de Productos", icono: "productos" },
    { id: "usuarios", label: "Gestionar Usuarios", icono: "usuarios" },
    { id: "exportar", label: "Exportar Datos", icono: "exportar" },
  ];

  if (!isOpen) return null;

  return (
    <>
      <div
        className="menu-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
      >
        <nav className="menu-lateral" ref={menuItemsRef} onClick={(e) => e.stopPropagation()}>
          {/* Header del menú con glassmorphism */}
          <div className="menu-header">
            <div className="menu-user-avatar">
              <span className="avatar-initial">{usuario?.email?.[0]?.toUpperCase() || "U"}</span>
            </div>
            <div className="menu-user-info">
              <span className="menu-email">{usuario?.email}</span>
              <span className="menu-rol-badge">{rol}</span>
            </div>
          </div>

          {/* Items del menú con animaciones escalonadas */}
          <div className="menu-items">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                className="menu-item stagger-item"
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => {
                  vibrar(15);
                  onNavigate(item.id);
                  onClose();
                }}
              >
                <span className="menu-item-icon">
                  <MenuIcono tipo={item.icono} />
                </span>
                <span className="menu-item-label">{item.label}</span>
                <span className="menu-item-chevron">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </span>
                <span className="menu-item-ripple" />
              </button>
            ))}
          </div>

          <div className="menu-divider" />

          {/* Botón de cerrar sesión */}
          <button
            className="menu-item menu-logout stagger-item"
            style={{ animationDelay: `${menuItems.length * 60}ms` }}
            onClick={() => {
              vibrar(15);
              onLogout();
              onClose();
            }}
          >
            <span className="menu-item-icon logout">
              <MenuIcono tipo="logout" />
            </span>
            <span className="menu-item-label">Cerrar Sesión</span>
            <span className="menu-item-ripple" />
          </button>

          {/* Versión de la app en el footer */}
          <div className="menu-footer">
            <span>Sistema de Averías v1.0</span>
          </div>
        </nav>
      </div>
    </>
  );
}

function App() {
  const { usuario, rol, logout } = useAuth();
  const [tabActiva, setTabActiva] = useState("registrar");
  const [mostrarSignup, setMostrarSignup] = useState(false);
  const [averiaEditar, setAveriaEditar] = useState(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const irA = useCallback((tab) => {
    vibrar(15);
    setTabActiva(tab);
    setMenuAbierto(false);
    if (tab !== "registrar") setAveriaEditar(null);
  }, []);

  const esAdmin = rol === "admin";
  const tabs = esAdmin ? TABS_ADMIN : TABS_OPERADOR;

  const currentIndex = tabs.findIndex((t) => t.id === tabActiva);
  const canSwipeLeft = currentIndex < tabs.length - 1;
  const canSwipeRight = currentIndex > 0;

  const swipeLeft = useCallback(() => {
    if (canSwipeLeft) {
      irA(tabs[currentIndex + 1].id);
    }
  }, [canSwipeLeft, currentIndex, tabs, irA]);

  const swipeRight = useCallback(() => {
    if (canSwipeRight) {
      irA(tabs[currentIndex - 1].id);
    }
  }, [canSwipeRight, currentIndex, tabs, irA]);

  const swipeEnabled = usuario && !averiaEditar && !menuAbierto;

  const swipeRef = useSwipeNavigation({
    onSwipeLeft: swipeLeft,
    onSwipeRight: swipeRight,
    threshold: 60,
    enabled: swipeEnabled,
  });

  const manejarEditar = (averia) => {
    vibrar();
    setAveriaEditar(averia);
    setTabActiva("registrar");
  };

  const cancelarEdicion = () => {
    vibrar();
    setAveriaEditar(null);
  };

  if (!usuario) {
    return mostrarSignup ? (
      <Signup onVolver={() => setMostrarSignup(false)} />
    ) : (
      <Login onCrearCuenta={() => setMostrarSignup(true)} />
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        {esAdmin && (
          <HamburgerButton
            isOpen={menuAbierto}
            onClick={() => {
              vibrar();
              setMenuAbierto(!menuAbierto);
            }}
          />
        )}
        <h1>Sistema de Averías</h1>
        <div className="header-right">
          <ToggleTema />
          <span className="user-rol">{rol}</span>
          <button className="btn-logout" onClick={() => { vibrar(); logout(); }}>
            Salir
          </button>
        </div>
      </header>

      <SideMenu
        isOpen={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        usuario={usuario}
        rol={rol}
        onNavigate={irA}
        onLogout={logout}
      />

      <main ref={swipeRef} className="app-main tab-content" key={tabActiva}>
        {tabActiva === "registrar" && (
          <FormAveria
            averiaEditar={averiaEditar}
            onCancelar={cancelarEdicion}
          />
        )}
        {tabActiva === "listado" && (
          <ListaAverias onEditar={manejarEditar} />
        )}
        {tabActiva === "exportar" && <ExportarExcel />}
        {tabActiva === "productos" && <ImportarProductos />}
        {tabActiva === "usuarios" && <AdminUsers />}
      </main>

      <nav className="app-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${tabActiva === tab.id ? "activa" : ""}`}
            onClick={() => irA(tab.id)}
          >
            <span className="nav-icon">
              <Icono tipo={tab.icono} />
            </span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;