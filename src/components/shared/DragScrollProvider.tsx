'use client';
import { useEffect } from 'react';

export default function DragScrollProvider() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const isFinePointer = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : true;
      if (!isFinePointer) return; // skip touch-first devices

      let activeEl: HTMLElement | null = null;
      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;
      let activePointerId: number | null = null;

      const onDocPointerDown = (e: PointerEvent) => {
        // only left button
        if ((e as any).button !== 0) return;
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const el = target.closest('.drag-scroll') as HTMLElement | null;
        if (!el) return;
        // only if horizontally scrollable
        if (el.scrollWidth <= el.clientWidth) return;

        activeEl = el;
        isDown = true;
        startX = e.clientX;
        scrollLeft = el.scrollLeft;
        activePointerId = (e as any).pointerId ?? null;
        try { (e.target as HTMLElement).setPointerCapture?.(activePointerId!); } catch {}
        el.style.cursor = 'grabbing';
        e.preventDefault();
      };

      const onWindowPointerMove = (e: PointerEvent) => {
        if (!isDown || !activeEl) return;
        if (activePointerId != null && (e as any).pointerId !== activePointerId) return;
        const dx = e.clientX - startX;
        activeEl.scrollLeft = scrollLeft - dx;
      };

      const onWindowPointerUp = (e: PointerEvent) => {
        if (!isDown || !activeEl) return;
        if (activePointerId != null && (e as any).pointerId !== activePointerId) return;
        try { (e.target as HTMLElement).releasePointerCapture?.((e as any).pointerId); } catch {}
        activeEl.style.cursor = 'grab';
        activeEl = null;
        isDown = false;
        activePointerId = null;
      };

      document.addEventListener('pointerdown', onDocPointerDown);
      window.addEventListener('pointermove', onWindowPointerMove);
      window.addEventListener('pointerup', onWindowPointerUp);

      return () => {
        document.removeEventListener('pointerdown', onDocPointerDown);
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
      };
    } catch {
      // silent
    }
  }, []);

  return null;
}
