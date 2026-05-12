"use client"
import React, { useCallback, useEffect, useRef, useState } from "react"

type Props = {
  totalPages: number
  renderPage: (page: number, canvas: HTMLCanvasElement) => Promise<void> | void
  initialPage?: number
}

export default function DocumentReader({ totalPages, renderPage, initialPage = 1 }: Props) {
  const [page, setPage] = useState<number>(Math.max(1, initialPage))
  const [isDesktop, setIsDesktop] = useState<boolean>(false)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement | null>>(new Map())

  // media query breakpoint: desktop > 768px
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 769px)")
    const updater = (e: MediaQueryListEvent | MediaQueryList) => {
      const prev = isDesktop
      setIsDesktop(e.matches)
      // if switching to desktop and current page is even, make it odd so pages pair naturally
      if (!prev && e.matches) {
        setPage((p) => (p % 2 === 0 ? Math.max(1, p - 1) : p))
      }
    }
    // initialize
    const initialMatches = mq.matches
    setIsDesktop(initialMatches)
    // ensure initial page pairs correctly when starting in desktop
    if (initialMatches) {
      setPage((p) => (p % 2 === 0 ? Math.max(1, p - 1) : p))
    }
    mq.addEventListener?.("change", updater)
    return () => mq.removeEventListener?.("change", updater)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const maxStartPage = useCallback(() => {
    if (!isDesktop) return totalPages
    return totalPages % 2 === 1 ? totalPages : Math.max(1, totalPages - 1)
  }, [isDesktop, totalPages])

  const step = isDesktop ? 2 : 1

  const goPrev = () => setPage((p) => Math.max(1, p - step))
  const goNext = () => setPage((p) => Math.min(maxStartPage(), p + step))

  const registerCanvas = useCallback((pageNumber: number) => (el: HTMLCanvasElement | null) => {
    canvasRefs.current.set(pageNumber, el)
  }, [])

  const visiblePages = () => {
    if (isDesktop) {
      return [page, page + 1].filter((p) => p <= totalPages)
    }
    return [page]
  }

  // resize canvas to wrapper size * devicePixelRatio for crisp rendering
  const prepareCanvasForRender = (canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.floor(rect.width * dpr))
    const h = Math.max(1, Math.floor(rect.height * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      canvas.style.width = "100%"
      canvas.style.height = "100%"
    }
    // adjust 2D context transform so drawing uses CSS pixels coordinates
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  // compute disabled states
  const prevDisabled = page <= 1
  const nextDisabled = page >= maxStartPage()

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">Page {page}{isDesktop ? " (two-page view)" : ""}</div>
        <div className="flex gap-2">
          <button
            onClick={goPrev}
            disabled={prevDisabled}
            className="px-3 py-1 rounded bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
            onClick={goNext}
            disabled={nextDisabled}
            className="px-3 py-1 rounded bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      <div
        className={`grid gap-4 ${isDesktop ? "grid-cols-2 justify-center" : "grid-cols-1"} items-start`}
      >
        {visiblePages().map((p) => (
          <div key={p} className="flex justify-center">
            <div className="relative aspect-[3/4] max-w-[400px] w-full bg-white shadow-sm">
              <canvas
                ref={registerCanvas(p)}
                // canvas uses absolute filling to let wrapper control layout
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
