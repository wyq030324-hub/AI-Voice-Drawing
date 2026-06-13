import { useRef, useEffect, useCallback } from 'react'
import { renderObjects } from '../commands/renderer'

/**
 * DrawCanvas — a full-size <canvas> that renders `objects` on every change
 * and automatically redraws when the element is resized.
 *
 * @param {{ objects: import('../commands/types').SceneObject[] }} props
 */
export default function DrawCanvas({ objects }) {
  const canvasRef = useRef(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    // Setting canvas.width clears the bitmap (even when value is unchanged).
    canvas.width  = width
    canvas.height = height
    renderObjects(canvas.getContext('2d'), objects, width, height)
  }, [objects])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    redraw()
    const ro = new ResizeObserver(redraw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [redraw])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
