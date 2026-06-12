/**
 * Drawing command schema.
 *
 * All coordinates and dimensions use 0–100 relative units so the LLM
 * never needs to think about canvas pixels.  The executor converts them
 * at render time based on the actual canvas size.
 *
 * x, y        → fraction of canvas width / height
 * r           → fraction of min(width, height)
 * w, h (rect) → fraction of canvas width / height
 * size (text) → fraction of min(width, height)
 * width (line) → CSS pixels (stroke width rarely needs to scale)
 *
 * @typedef {{ type: 'circle', x: number, y: number, r: number, fill?: string, stroke?: string }} CircleCmd
 * @typedef {{ type: 'rect',   x: number, y: number, w: number, h: number, fill?: string, stroke?: string }} RectCmd
 * @typedef {{ type: 'line',   x1: number, y1: number, x2: number, y2: number, stroke?: string, width?: number }} LineCmd
 * @typedef {{ type: 'text',   x: number, y: number, content: string, size?: number, fill?: string }} TextCmd
 * @typedef {{ type: 'clear' }} ClearCmd
 * @typedef {CircleCmd | RectCmd | LineCmd | TextCmd | ClearCmd} DrawCommand
 */

/** All recognised command type strings. */
export const COMMAND_TYPES = Object.freeze(['circle', 'rect', 'line', 'text', 'clear'])
