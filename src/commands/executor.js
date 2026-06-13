/**
 * Pure scene mutation helpers — no canvas, no side effects.
 *
 * applyCommand(objects, cmd)  → SceneObject[]
 * applyCommands(objects, cmds) → SceneObject[]
 *
 * Rules:
 *  - Returns a new array; never mutates the input.
 *  - Invalid / unknown commands are skipped with console.warn.
 *  - Shape commands with an existing id replace the old object in-place
 *    (preserves draw order for objects the LLM keeps).
 */

const DEFAULT_TEXT_SIZE = 4
const MIN_STROKE_WIDTH = 1

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

function readTransform(transform) {
  if (!transform || typeof transform !== 'object') {
    console.warn('[executor] group update: missing transform')
    return null
  }

  const hasTranslateX = Object.hasOwn(transform, 'translateX')
  const hasTranslateY = Object.hasOwn(transform, 'translateY')
  const hasScale = Object.hasOwn(transform, 'scale')

  if (!hasTranslateX && !hasTranslateY && !hasScale) {
    console.warn('[executor] group update: empty transform', transform)
    return null
  }

  const translateX = hasTranslateX ? transform.translateX : 0
  const translateY = hasTranslateY ? transform.translateY : 0
  const scale = hasScale ? transform.scale : 1

  if (!isFiniteNumber(translateX) || !isFiniteNumber(translateY)) {
    console.warn('[executor] group update: bad translation', transform)
    return null
  }
  if (!isFiniteNumber(scale) || scale <= 0) {
    console.warn('[executor] group update: bad scale', transform)
    return null
  }

  return { translateX, translateY, scale }
}

function getObjectBounds(obj) {
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
      const { x1, y1, x2, y2, width } = obj
      if (!allFinite(x1, y1, x2, y2) || (width !== undefined && !isFiniteNumber(width))) return null
      return { minX: Math.min(x1, x2), minY: Math.min(y1, y2), maxX: Math.max(x1, x2), maxY: Math.max(y1, y2) }
    }
    case 'text': {
      const { x, y, content, size } = obj
      if (!allFinite(x, y) || (size !== undefined && !isFiniteNumber(size))) return null
      const textSize = size ?? DEFAULT_TEXT_SIZE
      const approxWidth = Math.max(textSize, String(content ?? '').length * textSize * 0.6)
      return { minX: x - approxWidth / 2, minY: y - textSize / 2, maxX: x + approxWidth / 2, maxY: y + textSize / 2 }
    }
    default:
      return null
  }
}

function getGroupBounds(members) {
  let bounds = null
  for (const member of members) {
    const memberBounds = getObjectBounds(member)
    if (!memberBounds) {
      console.warn('[executor] group update: cannot measure object', member)
      return null
    }
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, memberBounds.minX),
          minY: Math.min(bounds.minY, memberBounds.minY),
          maxX: Math.max(bounds.maxX, memberBounds.maxX),
          maxY: Math.max(bounds.maxY, memberBounds.maxY),
        }
      : memberBounds
  }
  return bounds
}

function transformObject(obj, center, transform) {
  const transformX = (value) => center.x + (value - center.x) * transform.scale + transform.translateX
  const transformY = (value) => center.y + (value - center.y) * transform.scale + transform.translateY
  const scaleSize = (value) => value * transform.scale

  switch (obj.type) {
    case 'circle':
      return { ...obj, x: transformX(obj.x), y: transformY(obj.y), r: scaleSize(obj.r) }
    case 'rect':
      return { ...obj, x: transformX(obj.x), y: transformY(obj.y), w: scaleSize(obj.w), h: scaleSize(obj.h) }
    case 'line': {
      const next = { ...obj, x1: transformX(obj.x1), y1: transformY(obj.y1), x2: transformX(obj.x2), y2: transformY(obj.y2) }
      if (obj.width !== undefined) next.width = Math.max(MIN_STROKE_WIDTH, scaleSize(obj.width))
      return next
    }
    case 'text': {
      const next = { ...obj, x: transformX(obj.x), y: transformY(obj.y) }
      if (obj.size !== undefined) next.size = scaleSize(obj.size)
      return next
    }
    default:
      return obj
  }
}

function allFinite(...values) {
  return values.every(isFiniteNumber)
}

function applyGroupTransform(objects, cmd) {
  if (!cmd.id) {
    console.warn('[executor] group update: missing group id', cmd)
    return objects
  }
  if (cmd.props) {
    console.warn('[executor] group update: props ignored; use transform instead', cmd)
  }

  const transform = readTransform(cmd.transform)
  if (!transform) return objects

  const members = objects.filter((o) => o.groupId === cmd.id)
  if (!members.length) {
    console.warn('[executor] group update: groupId not found:', cmd.id)
    return objects
  }

  const bounds = getGroupBounds(members)
  if (!bounds) return objects

  const center = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  }

  return objects.map((obj) => (
    obj.groupId === cmd.id ? transformObject(obj, center, transform) : obj
  ))
}

/**
 * @param {import('./types').SceneObject[]} objects
 * @param {import('./types').DrawCommand} cmd
 * @returns {import('./types').SceneObject[]}
 */
export function applyCommand(objects, cmd) {
  try {
    switch (cmd?.type) {
      case 'clear':
        return []

      case 'delete': {
        if (!cmd.id) { console.warn('[executor] delete: missing id', cmd); return objects }
        if (cmd.scope === 'group') {
          const next = objects.filter((o) => o.groupId !== cmd.id)
          if (next.length === objects.length) {
            console.warn('[executor] delete group: groupId not found:', cmd.id)
            return objects
          }
          return next
        }
        return objects.filter((o) => o.id !== cmd.id)
      }

      case 'update': {
        if (cmd.scope === 'group') return applyGroupTransform(objects, cmd)

        if (!cmd.id || !cmd.props) {
          console.warn('[executor] update: missing id or props', cmd)
          return objects
        }
        const idx = objects.findIndex((o) => o.id === cmd.id)
        if (idx < 0) {
          console.warn('[executor] update: id not found:', cmd.id)
          return objects
        }
        const { id: _ignoredId, type: _ignoredType, ...safeProps } = cmd.props
        if (Object.keys(safeProps).length === 0) {
          console.warn('[executor] update: no editable props', cmd)
          return objects
        }
        const next = [...objects]
        next[idx] = { ...next[idx], ...safeProps }
        return next
      }

      case 'circle':
      case 'rect':
      case 'line':
      case 'text': {
        if (!cmd.id) { console.warn('[executor] shape: missing id', cmd); return objects }
        const obj = { ...cmd }   // type + id + all shape props
        const idx = objects.findIndex((o) => o.id === cmd.id)
        if (idx >= 0) {
          const next = [...objects]
          next[idx] = obj
          return next
        }
        return [...objects, obj]
      }

      default:
        console.warn('[executor] unknown command type:', cmd?.type, cmd)
        return objects
    }
  } catch (err) {
    console.warn('[executor] error applying command:', cmd, err)
    return objects
  }
}

/**
 * @param {import('./types').SceneObject[]} objects
 * @param {import('./types').DrawCommand[]} commands
 * @returns {import('./types').SceneObject[]}
 */
export function applyCommands(objects, commands) {
  if (!Array.isArray(commands)) return objects
  return commands.reduce(applyCommand, objects)
}
