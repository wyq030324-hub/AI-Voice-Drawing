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
