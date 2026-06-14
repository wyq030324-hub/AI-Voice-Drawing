function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function clampOpacity(value) {
  return isFiniteNumber(value) ? Math.max(0, Math.min(1, value)) : null
}

function shapeAttrs(attrs) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}="${escapeXml(value)}"`)
    .join(' ')
}

function strokeWidthOf(object) {
  if (isFiniteNumber(object?.strokeWidth) && object.strokeWidth > 0) return object.strokeWidth
  if (isFiniteNumber(object?.width) && object.width > 0) return object.width
  return null
}

function serializeObject(object) {
  const opacity = clampOpacity(object?.opacity)
  const common = opacity !== null ? { opacity } : {}

  switch (object?.type) {
    case 'circle':
      if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y) || !isFiniteNumber(object.r)) return null
      return `<circle ${shapeAttrs({
        cx: object.x,
        cy: object.y,
        r: object.r,
        fill: object.fill || 'none',
        stroke: object.stroke || null,
        'stroke-width': strokeWidthOf(object),
        ...common,
      })} />`

    case 'rect':
      if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y) || !isFiniteNumber(object.w) || !isFiniteNumber(object.h)) return null
      return `<rect ${shapeAttrs({
        x: object.x,
        y: object.y,
        width: object.w,
        height: object.h,
        fill: object.fill || 'none',
        stroke: object.stroke || null,
        'stroke-width': strokeWidthOf(object),
        ...common,
      })} />`

    case 'line':
      if (!isFiniteNumber(object.x1) || !isFiniteNumber(object.y1) || !isFiniteNumber(object.x2) || !isFiniteNumber(object.y2)) return null
      return `<line ${shapeAttrs({
        x1: object.x1,
        y1: object.y1,
        x2: object.x2,
        y2: object.y2,
        fill: 'none',
        stroke: object.stroke || '#000000',
        'stroke-width': strokeWidthOf(object) || 1,
        ...common,
      })} />`

    case 'text':
      if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y) || typeof object.content !== 'string') return null
      return `<text ${shapeAttrs({
        x: object.x,
        y: object.y,
        fill: object.fill || '#000000',
        'font-size': isFiniteNumber(object.size) ? object.size : 4,
        'font-family': 'system-ui, sans-serif',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        ...common,
      })}>${escapeXml(object.content)}</text>`

    default:
      return null
  }
}

export function sceneToSvg(objects) {
  const body = Array.isArray(objects)
    ? objects.map(serializeObject).filter(Boolean).join('\n  ')
    : ''

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="AI-Voice-Drawing export">',
    body ? `  ${body}` : '',
    '</svg>',
  ].filter(Boolean).join('\n')
}

export function downloadTextFile(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
