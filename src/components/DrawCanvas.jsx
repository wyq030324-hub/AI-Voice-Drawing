import { useRef, useEffect, useCallback } from 'react'
import { executeCommands } from '../commands/executor'

/**
 * DrawCanvas — a full-size <canvas> that replays `commands` on every change
 * and automatically redraws when the element is resized.
 *
 * @param {{ commands: import('../commands/types').DrawCommand[] }} props
 */
export default function DrawCanvas({ commands }) {
  const canvasRef = useRef(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const { width, height } = canvas.getBoundingClientRect()
    if (!width || !height) return
    // Assigning canvas.width resets the bitmap (clears it) even if the value is unchanged.
    canvas.width  = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    executeCommands(ctx, commands, width, height)
  }, [commands])

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
