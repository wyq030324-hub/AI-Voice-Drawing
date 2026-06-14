import { useRef, useEffect, useCallback } from 'react'
import { renderObjects } from '../commands/renderer'
import { clientPointToScenePoint, getObjectBounds, hitTestObjectAt } from '../utils/hitTest'

/**
 * DrawCanvas — a full-size <canvas> that renders `objects` on every change
 * and automatically redraws when the element is resized.
 *
 * @param {{ objects: import('../commands/types').SceneObject[], selectedObjectId?: string|null, onSelectObject?: (id: string|null) => void, canvasRef?: import('react').MutableRefObject<HTMLCanvasElement|null> }} props
 */
export default function DrawCanvas({ objects, selectedObjectId = null, onSelectObject, canvasRef: externalCanvasRef = null }) {
  const canvasRef = useRef(null)
  const selectedObject = objects.find((obj) => obj.id === selectedObjectId) ?? null

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    // Setting canvas.width clears the bitmap (even when value is unchanged).
    canvas.width  = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    drawCoordinateGrid(ctx, width, height)
    renderObjects(ctx, objects, width, height)
    if (selectedObject) renderSelection(ctx, selectedObject, width, height)
  }, [objects, selectedObject])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    redraw()
    const ro = new ResizeObserver(redraw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [redraw])

  const handlePointerDown = useCallback((event) => {
    if (!onSelectObject) return
    const canvas = canvasRef.current
    if (!canvas) return
    const point = clientPointToScenePoint(event, canvas)
    const hit = hitTestObjectAt(objects, point)
    onSelectObject(hit?.id ?? null)
  }, [objects, onSelectObject])

  useEffect(() => {
    if (!externalCanvasRef) return
    externalCanvasRef.current = canvasRef.current
    return () => {
      if (externalCanvasRef.current === canvasRef.current) {
        externalCanvasRef.current = null
      }
    }
  }, [externalCanvasRef])

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

function drawCoordinateGrid(ctx, width, height) {
  const rx = (value) => (value / 100) * width
  const ry = (value) => (value / 100) * height

  ctx.save()
  ctx.lineWidth = 1
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let value = 0; value <= 100; value += 10) {
    const x = rx(value)
    const y = ry(value)
    const isCenter = value === 50
    const isEdge = value === 0 || value === 100

    ctx.beginPath()
    ctx.strokeStyle = isCenter
      ? 'rgba(14, 165, 233, 0.26)'
      : isEdge
        ? 'rgba(15, 23, 42, 0.20)'
        : 'rgba(15, 23, 42, 0.08)'
    ctx.lineWidth = isCenter ? 1.2 : 1
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(15, 23, 42, 0.24)'
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1)

  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)'
  for (const value of [0, 50, 100]) {
    const x = rx(value)
    const y = ry(value)
    const xLabel = value === 0 ? 12 : value === 100 ? width - 16 : x
    const yLabel = value === 0 ? 12 : value === 100 ? height - 12 : y
    ctx.fillText(String(value), xLabel, 12)
    ctx.fillText(String(value), 16, yLabel)
  }

  ctx.restore()
}

function renderSelection(ctx, obj, width, height) {
  const bounds = getObjectBounds(obj)
  if (!bounds) return

  const pad = 1.2
  const rx = (value) => (value / 100) * width
  const ry = (value) => (value / 100) * height
  const x = rx(bounds.minX - pad)
  const y = ry(bounds.minY - pad)
  const w = rx(bounds.maxX - bounds.minX + pad * 2)
  const h = ry(bounds.maxY - bounds.minY + pad * 2)

  ctx.save()
  ctx.setLineDash([6, 4])
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#38bdf8'
  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)
  ctx.restore()
}
