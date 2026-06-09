import { useEffect, useState, useRef, useCallback } from "react";

const VisorImagen = ({ src, alt, onCerrar }) => {
  const [escala, setEscala] = useState(1);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [arrastrando, setArrastrando] = useState(false);
  const ultimaPosicion = useRef({ x: 0, y: 0 });
  const distanciaInicial = useRef(null);
  const escalaInicial = useRef(1);

  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", manejarTecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = "";
    };
  }, [onCerrar]);

  const reiniciar = useCallback(() => {
    setEscala(1);
    setPosicion({ x: 0, y: 0 });
  }, []);

  const obtenerDistancia = (toques) => {
    const dx = toques[0].clientX - toques[1].clientX;
    const dy = toques[0].clientY - toques[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const manejarTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      distanciaInicial.current = obtenerDistancia(e.touches);
      escalaInicial.current = escala;
    } else if (e.touches.length === 1 && escala > 1) {
      setArrastrando(true);
      ultimaPosicion.current = {
        x: e.touches[0].clientX - posicion.x,
        y: e.touches[0].clientY - posicion.y,
      };
    }
  };

  const manejarTouchMove = (e) => {
    if (e.touches.length === 2 && distanciaInicial.current) {
      e.preventDefault();
      const nuevaDistancia = obtenerDistancia(e.touches);
      const ratio = nuevaDistancia / distanciaInicial.current;
      const nuevaEscala = Math.min(Math.max(escalaInicial.current * ratio, 1), 5);
      setEscala(nuevaEscala);
    } else if (e.touches.length === 1 && arrastrando && escala > 1) {
      e.preventDefault();
      setPosicion({
        x: e.touches[0].clientX - ultimaPosicion.current.x,
        y: e.touches[0].clientY - ultimaPosicion.current.y,
      });
    }
  };

  const manejarTouchEnd = () => {
    distanciaInicial.current = null;
    setArrastrando(false);
    if (escala <= 1) {
      reiniciar();
    }
  };

  const manejarWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    const nuevaEscala = Math.min(Math.max(escala + delta, 1), 5);
    setEscala(nuevaEscala);
    if (nuevaEscala <= 1) reiniciar();
  };

  const manejarDobleClick = () => {
    if (escala > 1) {
      reiniciar();
    } else {
      setEscala(2.5);
    }
  };

  const estilo = {
    transform: `translate(${posicion.x}px, ${posicion.y}px) scale(${escala})`,
    cursor: escala > 1 ? (arrastrando ? "grabbing" : "grab") : "default",
    transition: arrastrando ? "none" : "transform 0.2s ease",
  };

  return (
    <div
      className="visor-overlay"
      onClick={onCerrar}
      onWheel={manejarWheel}
    >
      <button className="visor-cerrar" onClick={onCerrar}>
        X
      </button>

      {escala > 1 && (
        <button
          className="visor-reiniciar"
          onClick={(e) => {
            e.stopPropagation();
            reiniciar();
          }}
        >
          1:1
        </button>
      )}

      <img
        src={src}
        alt={alt || ""}
        className="visor-imagen"
        style={estilo}
        onDoubleClick={(e) => {
          e.stopPropagation();
          manejarDobleClick();
        }}
        onTouchStart={manejarTouchStart}
        onTouchMove={manejarTouchMove}
        onTouchEnd={manejarTouchEnd}
        draggable={false}
      />
    </div>
  );
};

export default VisorImagen;