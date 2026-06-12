/**
 * executeCommands(ctx, commands, w, h)
 *
 * Replays a DrawCommand array onto a 2D canvas context.
 * Invalid or unknown commands are skipped with a console.warn — never throws.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./types').DrawCommand[]} commands
 * @param {number} w  canvas pixel width
 * @param {number} h  canvas pixel height
 */
export function executeCommands(ctx, commands, w, h) {
  if (!Array.isArray(commands)) return

  const minDim = Math.min(w, h)

  // Convert a 0-100 relative value to pixels along the given axis total.
  const rx = (v) => (v / 100) * w
  const ry = (v) => (v / 100) * h
  const rm = (v) => (v / 100) * minDim  // relative to shorter side (for radii / font sizes)

  const ok = (...vals) => vals.every((v) => typeof v === 'number' && isFinite(v))

  for (const cmd of commands) {
    try {
      switch (cmd?.type) {
        case 'clear':
          ctx.clearRect(0, 0, w, h)
          break

        case 'circle': {
          const { x, y, r, fill, stroke } = cmd
          if (!ok(x, y, r)) { console.warn('[executor] circle: bad params', cmd); break }
          ctx.beginPath()
          ctx.arc(rx(x), ry(y), rm(r), 0, Math.PI * 2)
          if (fill)   { ctx.fillStyle   = fill;   ctx.fill()   }
          if (stroke) { ctx.strokeStyle = stroke; ctx.stroke() }
          break
        }

        case 'rect': {
          // Destructure cmd.w / cmd.h as cw / ch to avoid shadowing the w / h params.
          const { x, y, w: cw, h: ch, fill, stroke } = cmd
          if (!ok(x, y, cw, ch)) { console.warn('[executor] rect: bad params', cmd); break }
          const X = rx(x), Y = ry(y), W = rx(cw), H = ry(ch)
          if (fill)   { ctx.fillStyle   = fill;   ctx.fillRect(X, Y, W, H)   }
          if (stroke) { ctx.strokeStyle = stroke; ctx.strokeRect(X, Y, W, H) }
          break
        }

        case 'line': {
          const { x1, y1, x2, y2, stroke, width } = cmd
          if (!ok(x1, y1, x2, y2)) { console.warn('[executor] line: bad params', cmd); break }
          ctx.beginPath()
          ctx.moveTo(rx(x1), ry(y1))
          ctx.lineTo(rx(x2), ry(y2))
          ctx.strokeStyle = stroke || '#000'
          ctx.lineWidth   = typeof width === 'number' && isFinite(width) ? width : 1
          ctx.stroke()
          break
        }

        case 'text': {
          const { x, y, content, size, fill } = cmd
          if (!ok(x, y) || typeof content !== 'string') {
            console.warn('[executor] text: bad params', cmd)
            break
          }
          const fs = ok(size) ? rm(size) : 16
          ctx.font         = `${fs}px sans-serif`
          ctx.fillStyle    = fill || '#000'
          ctx.textAlign    = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(content, rx(x), ry(y))
          break
        }

        default:
          console.warn('[executor] unknown command type:', cmd?.type, cmd)
      }
    } catch (err) {
      console.warn('[executor] runtime error on command:', cmd, err)
    }
  }
}
