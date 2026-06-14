/**
 * renderObjects(ctx, objects, w, h)
 *
 * Draws a SceneObject[] onto a 2D canvas context.
 * The caller is responsible for clearing the canvas beforehand.
 * Invalid objects are skipped with console.warn — never throws.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./types').SceneObject[]} objects
 * @param {number} w  canvas pixel width
 * @param {number} h  canvas pixel height
 */
export function renderObjects(ctx, objects, w, h) {
  if (!Array.isArray(objects) || !objects.length) return

  const minDim = Math.min(w, h)
  const rx = (v) => (v / 100) * w
  const ry = (v) => (v / 100) * h
  const rm = (v) => (v / 100) * minDim
  const ok = (...vals) => vals.every((v) => typeof v === 'number' && isFinite(v))
  const opacity = (obj) => ok(obj?.opacity) ? Math.max(0, Math.min(1, obj.opacity)) : 1
  const strokeWidth = (obj, fallback = 1) => ok(obj?.strokeWidth) && obj.strokeWidth > 0
    ? obj.strokeWidth
    : ok(obj?.width) && obj.width > 0
      ? obj.width
      : fallback

  for (const obj of objects) {
    ctx.save()
    try {
      ctx.globalAlpha = opacity(obj)
      ctx.lineWidth = strokeWidth(obj)

      switch (obj?.type) {
        case 'circle': {
          const { x, y, r, fill, stroke } = obj
          if (!ok(x, y, r)) { console.warn('[renderer] circle bad params', obj); break }
          ctx.beginPath()
          ctx.arc(rx(x), ry(y), rm(r), 0, Math.PI * 2)
          if (fill)   { ctx.fillStyle   = fill;   ctx.fill()   }
          if (stroke) { ctx.strokeStyle = stroke; ctx.stroke() }
          break
        }

        case 'rect': {
          const { x, y, w: cw, h: ch, fill, stroke } = obj
          if (!ok(x, y, cw, ch)) { console.warn('[renderer] rect bad params', obj); break }
          const X = rx(x), Y = ry(y), W = rx(cw), H = ry(ch)
          if (fill)   { ctx.fillStyle   = fill;   ctx.fillRect(X, Y, W, H)   }
          if (stroke) { ctx.strokeStyle = stroke; ctx.strokeRect(X, Y, W, H) }
          break
        }

        case 'line': {
          const { x1, y1, x2, y2, stroke } = obj
          if (!ok(x1, y1, x2, y2)) { console.warn('[renderer] line bad params', obj); break }
          ctx.beginPath()
          ctx.moveTo(rx(x1), ry(y1))
          ctx.lineTo(rx(x2), ry(y2))
          ctx.strokeStyle = stroke || '#000'
          ctx.lineWidth   = strokeWidth(obj)
          ctx.stroke()
          break
        }

        case 'text': {
          const { x, y, content, size, fill } = obj
          if (!ok(x, y) || typeof content !== 'string') {
            console.warn('[renderer] text bad params', obj)
            break
          }
          ctx.font         = `${ok(size) ? rm(size) : 16}px sans-serif`
          ctx.fillStyle    = fill || '#000'
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(content, rx(x), ry(y))
          break
        }

        default:
          console.warn('[renderer] unknown object type:', obj?.type, obj)
      }
    } catch (err) {
      console.warn('[renderer] runtime error on object:', obj, err)
    } finally {
      ctx.restore()
    }
  }
}
