/**
 * Drawing command / scene mutation schema — PR#3+.
 *
 * All coordinates and sizes use 0–100 relative units so the LLM never
 * needs to think about canvas pixels.  The renderer converts at draw time.
 *
 *   x, y              → % of canvas width / height
 *   r  (circle)       → % of min(width, height)
 *   w, h  (rect)      → % of canvas width / height
 *   size  (text)      → % of min(width, height)
 *   x1,y1,x2,y2       → % of canvas width / height
 *   width (line)      → CSS pixel integer
 *
 * Every shape carries a unique string `id`.
 * The LLM is instructed to use short, semantic English ids (sun, house_wall…).
 *
 * @typedef {{ type:'circle', id:string, x:number, y:number, r:number, fill?:string, stroke?:string, groupId?:string, groupLabel?:string, role?:string }} CircleCmd
 * @typedef {{ type:'rect',   id:string, x:number, y:number, w:number, h:number, fill?:string, stroke?:string, groupId?:string, groupLabel?:string, role?:string }} RectCmd
 * @typedef {{ type:'line',   id:string, x1:number, y1:number, x2:number, y2:number, stroke?:string, width?:number, groupId?:string, groupLabel?:string, role?:string }} LineCmd
 * @typedef {{ type:'text',   id:string, x:number, y:number, content:string, size?:number, fill?:string, groupId?:string, groupLabel?:string, role?:string }} TextCmd
 * @typedef {{ translateX?:number, translateY?:number, scale?:number }} GroupTransform
 * @typedef {{ type:'clear' }} ClearCmd
 * @typedef {{ type:'update', id:string, scope?:'object'|'group', props?:Record<string,unknown>, transform?:GroupTransform }} UpdateCmd
 * @typedef {{ type:'delete', id:string, scope?:'object'|'group' }} DeleteCmd
 *
 * @typedef {CircleCmd|RectCmd|LineCmd|TextCmd|ClearCmd|UpdateCmd|DeleteCmd} DrawCommand
 * @typedef {CircleCmd|RectCmd|LineCmd|TextCmd} SceneObject  — what lives in App state
 */

export const COMMAND_TYPES = Object.freeze(['circle','rect','line','text','clear','update','delete'])
export const SHAPE_TYPES   = Object.freeze(['circle','rect','line','text'])
