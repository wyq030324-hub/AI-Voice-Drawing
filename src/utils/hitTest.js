const HIT_TOLERANCE = 2
const LINE_TOLERANCE = 2.5
const DEFAULT_TEXT_SIZE = 4

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)
const allFinite = (...values) => values.every(isFiniteNumber)

export function clientPointToScenePoint(event, element) {
  const rect = element.getBoundingClientRect()
  if (!rect.width || !rect.height) return null

  return {
    x: ((event.clientX - rect.left) / rect.width) * 100,
    y: ((event.clientY - rect.top) / rect.height) * 100,
  }
}

export function hitTestObjectAt(objects, point) {
  if (!Array.isArray(objects) || !point) return null

  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i]
    if (containsPoint(obj, point)) return obj
  }

  return null
}

export function getObjectBounds(obj) {
  switch (obj?.type) {
    case 'circle': {
      const { x, y, r } = obj
      if (!allFinite(x, y, r)) return null
      return { minX: x - r, minY: y - r, maxX: x + r, maxY: y + r }
    }

    case 'rect': {
      const { x, y, w, h } = obj
      if (!allFinite(x, y, w, h)) return null
      return { minX: x, minY: y, maxX: x + w, maxY: y + h }
    }

    case 'line': {
      const { x1, y1, x2, y2 } = obj
      if (!allFinite(x1, y1, x2, y2)) return null
      return {
        minX: Math.min(x1, x2),
        minY: Math.min(y1, y2),
        maxX: Math.max(x1, x2),
        maxY: Math.max(y1, y2),
      }
    }

    case 'text': {
      const { x, y, content, size } = obj
      if (!allFinite(x, y) || typeof content !== 'string') return null
      const textSize = isFiniteNumber(size) ? size : DEFAULT_TEXT_SIZE
      const approxWidth = Math.max(textSize, content.length * textSize * 0.6)
      return {
        minX: x - approxWidth / 2,
        minY: y - textSize / 2,
        maxX: x + approxWidth / 2,
        maxY: y + textSize / 2,
      }
    }

    default:
      return null
  }
}

function containsPoint(obj, point) {
  switch (obj?.type) {
    case 'circle':
      return hitCircle(obj, point)
    case 'rect':
      return hitRect(obj, point)
    case 'line':
      return hitLine(obj, point)
    case 'text':
      return hitText(obj, point)
    default:
      return false
  }
}

function hitCircle(obj, point) {
  const { x, y, r } = obj
  if (!allFinite(x, y, r)) return false
  return Math.hypot(point.x - x, point.y - y) <= r + HIT_TOLERANCE
}

function hitRect(obj, point) {
  const { x, y, w, h } = obj
  if (!allFinite(x, y, w, h)) return false
  return (
    point.x >= Math.min(x, x + w) - HIT_TOLERANCE &&
    point.x <= Math.max(x, x + w) + HIT_TOLERANCE &&
    point.y >= Math.min(y, y + h) - HIT_TOLERANCE &&
    point.y <= Math.max(y, y + h) + HIT_TOLERANCE
  )
}

function hitLine(obj, point) {
  const { x1, y1, x2, y2 } = obj
  if (!allFinite(x1, y1, x2, y2)) return false

  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(point.x - x1, point.y - y1) <= LINE_TOLERANCE

  const t = Math.max(0, Math.min(1, ((point.x - x1) * dx + (point.y - y1) * dy) / lenSq))
  const px = x1 + t * dx
  const py = y1 + t * dy
  return Math.hypot(point.x - px, point.y - py) <= LINE_TOLERANCE
}

function hitText(obj, point) {
  const bounds = getObjectBounds(obj)
  if (!bounds) return false
  return (
    point.x >= bounds.minX - HIT_TOLERANCE &&
    point.x <= bounds.maxX + HIT_TOLERANCE &&
    point.y >= bounds.minY - HIT_TOLERANCE &&
    point.y <= bounds.maxY + HIT_TOLERANCE
  )
}
