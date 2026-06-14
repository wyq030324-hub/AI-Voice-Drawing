import { useRef, useEffect, useCallback } from 'react'
import { renderObjects } from '../commands/renderer'
import { clientPointToScenePoint, getObjectBounds, hitTestObjectAt } from '../utils/hitTest'

/**
 * DrawCanvas — a full-size <canvas> that renders `objects` on every change
 * and automatically redraws when the element is resized.
 *
 * @param {{ objects: import('../commands/types').SceneObject[], selectedObjectId?: string|null, onSelectObject?: (id: string|null) => void }} props
 */
export default function DrawCanvas({ objects, selectedObjectId = null, onSelectObject }) {
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

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
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
