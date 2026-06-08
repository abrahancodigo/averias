import { useRef, useEffect, useCallback } from "react";

export const useSwipeNavigation = ({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  enabled = true,
}) => {
  const elementRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isSwipingRef = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isSwipingRef.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (!isSwipingRef.current && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwipingRef.current = true;
    }
  }, [enabled]);

  const handleTouchEnd = useCallback((e) => {
    if (!enabled || !isSwipingRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaTime = Date.now() - touchStartRef.current.time;

    if (Math.abs(deltaX) >= threshold && deltaTime < 500) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
    isSwipingRef.current = false;
  }, [enabled, onSwipeLeft, onSwipeRight, threshold]);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return elementRef;
};