import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ScaledDocumentFrameProps {
  naturalWidth: number;
  naturalHeight: number;
  zoomMode: 'fit' | 'actual';
  recalcTrigger?: string | number | boolean;
  children: React.ReactNode;
}

/**
 * Lossless responsive scaler for fixed-ratio print documents (A4 794x1123, Slide 960x540).
 * Keeps the inner capture target at its exact natural pixel dimensions while scaling only
 * the visual wrapper via ResizeObserver, eliminating horizontal overflow and bottom gaps.
 */
export const ScaledDocumentFrame: React.FC<ScaledDocumentFrameProps> = ({
  naturalWidth,
  naturalHeight,
  zoomMode,
  recalcTrigger,
  children,
}) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [measuredHeight, setMeasuredHeight] = useState<number>(naturalHeight);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const updateWidth = () => {
      const w = outer.clientWidth;
      if (w > 0) {
        setContainerWidth(w);
      }
    };

    updateWidth();
    const rafId = window.requestAnimationFrame(updateWidth);

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', updateWidth);
      };
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) {
          setContainerWidth(w);
        }
      }
    });
    ro.observe(outer);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [recalcTrigger]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const updateHeight = () => {
      const h = inner.offsetHeight;
      if (h > 0) {
        setMeasuredHeight(h);
      }
    };

    updateHeight();
    const rafId = window.requestAnimationFrame(updateHeight);

    if (typeof ResizeObserver === 'undefined') {
      return () => window.cancelAnimationFrame(rafId);
    }

    const ro = new ResizeObserver(() => {
      updateHeight();
    });
    ro.observe(inner);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [recalcTrigger, naturalHeight]);

  const effectiveHeight = Math.max(measuredHeight, naturalHeight);
  const shouldScale =
    zoomMode === 'fit' && containerWidth > 0 && containerWidth < naturalWidth;
  const scale = shouldScale ? Math.min(1, containerWidth / naturalWidth) : 1;

  if (zoomMode === 'actual' && containerWidth > 0 && containerWidth < naturalWidth) {
    return (
      <div ref={outerRef} className="w-full overflow-x-auto overscroll-x-contain pb-2">
        <div
          ref={innerRef}
          className="scaled-doc-inner mx-auto"
          style={{ width: `${naturalWidth}px` }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div ref={outerRef} className="w-full flex justify-center">
      <div
        className="scaled-doc-wrapper relative overflow-hidden"
        style={
          shouldScale
            ? {
                width: `${Math.floor(naturalWidth * scale)}px`,
                height: `${Math.ceil(effectiveHeight * scale)}px`,
              }
            : {
                width: `${naturalWidth}px`,
              }
        }
      >
        <div
          ref={innerRef}
          className="scaled-doc-inner"
          style={
            shouldScale
              ? {
                  width: `${naturalWidth}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }
              : {
                  width: `${naturalWidth}px`,
                }
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
};
