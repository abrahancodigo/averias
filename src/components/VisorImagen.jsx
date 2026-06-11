import { useEffect, useState, useRef, useCallback } from "react";

const VisorImagen = ({ fotos, indiceInicial = 0, onCerrar }) => {
  const [indiceActual, setIndiceActual] = useState(indiceInicial);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const stateRef = useRef({
    escala: 1,
    posX: 0,
    posY: 0,
    arrastrando: false,
    startDist: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startPinchX: 0,
    startPinchY: 0,
    lastTap: 0,
    isSwiping: false,
    swipeStartX: 0,
    swiped: false,
  });

  const [renderKey, setRenderKey] = useState(0);

  const src = fotos[indiceActual];
  const totalFotos = fotos.length;

  const applyTransform = useCallback(() => {
    const s = stateRef.current;
    if (imgRef.current) {
      imgRef.current.style.transform = `translate(${s.posX}px, ${s.posY}px) scale(${s.escala})`;
    }
  }, []);

  const clampPosition = useCallback(() => {
    const s = stateRef.current;
    if (!containerRef.current || !imgRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const imgWidth = imgRef.current.naturalWidth || containerRect.width * 0.9;
    const imgHeight = imgRef.current.naturalHeight || containerRect.height * 0.85;

    const scaledWidth = Math.min(imgWidth, containerRect.width * 0.9) * s.escala;
    const scaledHeight = Math.min(imgHeight, containerRect.height * 0.85) * s.escala;

    const minX = Math.min(0, -(scaledWidth / 2) + containerRect.width / 2);
    const maxX = Math.max(0, (scaledWidth / 2) - containerRect.width / 2 + containerRect.width);
    const minY = Math.min(0, -(scaledHeight / 2) + containerRect.height / 2);
    const maxY = Math.max(0, (scaledHeight / 2) - containerRect.height / 2 + containerRect.height);

    if (scaledWidth <= containerRect.width) {
      s.posX = (containerRect.width - scaledWidth) / 2;
    } else {
      s.posX = Math.min(Math.max(s.posX, -scaledWidth + containerRect.width), 0);
    }

    if (scaledHeight <= containerRect.height) {
      s.posY = (containerRect.height - scaledHeight) / 2;
    } else {
      s.posY = Math.min(Math.max(s.posY, -scaledHeight + containerRect.height), 0);
    }
  }, []);

  const resetView = useCallback(() => {
    const s = stateRef.current;
    s.escala = 1;
    s.posX = 0;
    s.posY = 0;
    applyTransform();
  }, [applyTransform]);

  const getDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getMidpoint = (touches) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      const s = stateRef.current;

      if (e.touches.length === 2) {
        e.preventDefault();
        s.startDist = getDistance(e.touches);
        s.startScale = s.escala;
        const mid = getMidpoint(e.touches);
        s.startPinchX = mid.x;
        s.startPinchY = mid.y;
        s.startX = s.posX;
        s.startY = s.posY;
        s.arrastrando = false;
        s.isSwiping = false;
      } else if (e.touches.length === 1) {
        s.startX = e.touches[0].clientX - s.posX;
        s.startY = e.touches[0].clientY - s.posY;
        s.swipeStartX = e.touches[0].clientX;
        s.swiped = false;
        s.isSwiping = s.escala === 1;
      }
    };

    const handleTouchMove = (e) => {
      const s = stateRef.current;

      if (e.touches.length === 2 && s.startDist) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        const scale = s.startScale * (dist / s.startDist);
        s.escala = Math.min(Math.max(scale, 1), 5);

        const mid = getMidpoint(e.touches);
        const dx = mid.x - s.startPinchX;
        const dy = mid.y - s.startPinchY;

        s.posX = s.startX + dx;
        s.posY = s.startY + dy;

        clampPosition();
        applyTransform();
      } else if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;

        if (s.escala > 1) {
          e.preventDefault();
          s.posX = touchX - s.startX;
          s.posY = touchY - s.startY;
          clampPosition();
          applyTransform();
        } else if (s.isSwiping) {
          const diffX = touchX - s.swipeStartX;
          if (Math.abs(diffX) > 10) {
            s.swiped = true;
          }
        }
      }
    };

    const handleTouchEnd = (e) => {
      const s = stateRef.current;

      if (e.touches.length === 0) {
        if (s.escala <= 1.05) {
          resetView();
        }

        if (s.isSwiping && s.swiped) {
          const diffX = e.changedTouches[0].clientX - s.swipeStartX;
          if (Math.abs(diffX) > 60) {
            if (diffX > 0 && indiceActual > 0) {
              reiniciar();
              setIndiceActual((prev) => Math.max(0, prev - 1));
              return;
            } else if (diffX < 0 && indiceActual < totalFotos - 1) {
              reiniciar();
              setIndiceActual((prev) => Math.min(totalFotos - 1, prev + 1));
              return;
            }
          }
        }

        const now = Date.now();
        if (now - s.lastTap < 300 && e.changedTouches.length === 1) {
          if (s.escala > 1) {
            resetView();
          } else {
            const rect = imgRef.current.getBoundingClientRect();
            const tapX = e.changedTouches[0].clientX - rect.left - rect.width / 2;
            const tapY = e.changedTouches[0].clientY - rect.top - rect.height / 2;

            s.escala = 2.5;
            s.posX = -tapX * 1.5;
            s.posY = -tapY * 1.5;
            clampPosition();
            applyTransform();
          }
          s.lastTap = 0;
        } else {
          s.lastTap = now;
        }

        s.startDist = 0;
        s.arrastrando = false;
        s.isSwiping = false;
      }
    };

    const handleTouchCancel = () => {
      stateRef.current.startDist = 0;
      stateRef.current.arrastrando = false;
      stateRef.current.isSwiping = false;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: false });
    container.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [indiceActual, totalFotos, applyTransform, clampPosition, resetView]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCerrar();
      if (e.key === "ArrowLeft" && indiceActual > 0) {
        resetView();
        setIndiceActual((prev) => Math.max(0, prev - 1));
      }
      if (e.key === "ArrowRight" && indiceActual < totalFotos - 1) {
        resetView();
        setIndiceActual((prev) => Math.min(totalFotos - 1, prev + 1));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [indiceActual, totalFotos, onCerrar, resetView]);

  const reiniciar = useCallback(() => {
    stateRef.current.escala = 1;
    stateRef.current.posX = 0;
    stateRef.current.posY = 0;
    stateRef.current.lastTap = 0;
  }, []);

  const handleNav = (delta) => {
    reiniciar();
    setIndiceActual((prev) => {
      const nuevo = prev + delta;
      return Math.max(0, Math.min(nuevo, totalFotos - 1));
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const s = stateRef.current;
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    s.escala = Math.min(Math.max(s.escala + delta, 1), 5);
    if (s.escala <= 1.05) resetView();
    applyTransform();
  };

  const hayAnterior = indiceActual > 0;
  const haySiguiente = indiceActual < totalFotos - 1;

  return (
    <div
      ref={containerRef}
      className="visor-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      onWheel={handleWheel}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <button className="visor-cerrar" onClick={onCerrar}>
        X
      </button>

      {totalFotos > 1 && (
        <div className="visor-contador">
          {indiceActual + 1} / {totalFotos}
        </div>
      )}

      {hayAnterior && (
        <button
          className="visor-nav visor-nav-izq"
          onClick={(e) => {
            e.stopPropagation();
            handleNav(-1);
          }}
        >
          &#8249;
        </button>
      )}

      {haySiguiente && (
        <button
          className="visor-nav visor-nav-der"
          onClick={(e) => {
            e.stopPropagation();
            handleNav(1);
          }}
        >
          &#8250;
        </button>
      )}

      <img
        ref={imgRef}
        key={`img-${indiceActual}`}
        src={src}
        alt={`Foto ${indiceActual + 1}`}
        className="visor-imagen"
        style={{
          transition: "transform 0.2s ease",
          cursor: "default",
        }}
        draggable={false}
      />
    </div>
  );
};

export default VisorImagen;
