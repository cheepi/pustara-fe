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
      let didMove = false;

      const onDocPointerDown = (e: PointerEvent) => {
        // only left button, only mouse/pen
        if (e.button !== 0) return;
        if (e.pointerType === 'touch') return;
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const el = target.closest('.drag-scroll') as HTMLElement | null;
        if (!el) return;
        // only if horizontally scrollable
        if (el.scrollWidth <= el.clientWidth) return;

        activeEl = el;
        isDown = true;
        didMove = false;
        startX = e.clientX;
        scrollLeft = el.scrollLeft;
        activePointerId = e.pointerId ?? null;

        // Set touch-action:none on the element so the browser doesn't
        // intercept the pointer stream once we've taken ownership
        el.style.touchAction = 'none';
        el.style.cursor = 'grabbing';

        try { target.setPointerCapture?.(activePointerId!); } catch {}
        e.preventDefault();
      };

      const onWindowPointerMove = (e: PointerEvent) => {
        if (!isDown || !activeEl) return;
        if (activePointerId != null && e.pointerId !== activePointerId) return;
        const dx = e.clientX - startX;
        if (!didMove && Math.abs(dx) < 2) return; // ignore micro-jitter
        didMove = true;
        activeEl.scrollLeft = scrollLeft - dx;
        e.preventDefault();
      };

      const onWindowPointerUp = (e: PointerEvent) => {
        if (!isDown || !activeEl) return;
        if (activePointerId != null && e.pointerId !== activePointerId) return;
        try { (e.target as HTMLElement).releasePointerCapture?.(e.pointerId); } catch {}
        // Restore touch-action so touch still works normally
        activeEl.style.touchAction = '';
        activeEl.style.cursor = '';
        activeEl = null;
        isDown = false;
        didMove = false;
        activePointerId = null;
      };

      // passive:false is critical — allows e.preventDefault() to actually suppress
      // the browser's native scroll/drag handling on the pointerdown
      document.addEventListener('pointerdown', onDocPointerDown, { passive: false });
      window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
      window.addEventListener('pointerup', onWindowPointerUp);
      window.addEventListener('pointercancel', onWindowPointerUp);

      return () => {
        document.removeEventListener('pointerdown', onDocPointerDown);
        window.removeEventListener('pointermove', onWindowPointerMove);
        window.removeEventListener('pointerup', onWindowPointerUp);
        window.removeEventListener('pointercancel', onWindowPointerUp);
      };
    } catch {
      // silent
    }
  }, []);

  return null;
}
