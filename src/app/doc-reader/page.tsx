"use client"
import React from "react"
import DocumentReader from "../../components/DocumentReader"

// Demo renderPage that draws a simple placeholder into the canvas.
async function demoRender(page: number, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  // clear
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  // background
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // draw page number centered
  ctx.fillStyle = "#111827"
  ctx.font = `${Math.floor(canvas.height * 0.08)}px sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(`Page ${page}`, canvas.width / 2, canvas.height / 2)
  // decorative border
  ctx.strokeStyle = "#e5e7eb"
  ctx.lineWidth = Math.max(1, Math.floor(canvas.width * 0.002))
  ctx.strokeRect(0, 0, canvas.width, canvas.height)
}

export default function Page() {
  // demo: pretend we have 7 pages
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Document Reader Demo</h1>
      <DocumentReader totalPages={7} renderPage={demoRender} />
    </div>
  )
}
