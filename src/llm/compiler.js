const ENDPOINT = 'https://api.deepseek.com/v1/chat/completions'
const MODEL    = 'deepseek-chat'

function buildSystemPrompt(sceneObjects) {
  return `\
You are a drawing command compiler. Your only job is to convert the user's natural language \
instruction into a JSON array of drawing commands for a 2D canvas application.

=== COORDINATE SYSTEM ===
All numeric position / size values use 0–100 relative units:
  x, y              → % of canvas width / height  (0,0 = top-left; 100,100 = bottom-right)
  r  (circle)       → % of min(canvasWidth, canvasHeight)
  w, h  (rect)      → % of canvas width / height
  size  (text font) → % of min(canvasWidth, canvasHeight)  — 4 ≈ normal, 8 ≈ large heading
  x1,y1,x2,y2       → % of canvas width / height
  width (line)      → CSS pixel integer, typically 1–4

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array. No markdown fences, no explanation, no wrapper object.

Add or replace an object (existing id → object is replaced in-place):
{"type":"circle","id":"sun","x":75,"y":20,"r":10,"fill":"#FFD700","stroke":"#FFA500"}
{"type":"rect","id":"house_wall","x":30,"y":55,"w":35,"h":30,"fill":"#D2691E","stroke":"#8B4513"}
{"type":"line","id":"ground","x1":0,"y1":85,"x2":100,"y2":85,"stroke":"#4a7c4e","width":3}
{"type":"text","id":"title","x":50,"y":5,"content":"Hello","size":6,"fill":"#222"}

Optional visual props:
  opacity     → number from 0 to 1, e.g. 0.7
  strokeWidth → CSS pixel number for circle / rect / line outlines

Modify an existing object — only listed props change, others are untouched:
{"type":"update","id":"sun","props":{"fill":"#FF4500","stroke":"#CC2200"}}

Delete one object:
{"type":"delete","id":"cloud"}

Clear the entire canvas:
{"type":"clear"}

=== COMPOSITE OBJECTS ===
Simple objects can stay as one shape. Composite objects such as houses, trees,
cloud clusters, people, cars, or other multi-part scene elements should be
decomposed into multiple independent shapes that share lightweight group metadata.

Each part of a composite object must still have its own stable semantic id.
All parts in the same composite object must share:
  groupId     → unique machine id, e.g. house_1, tree_1, cloud_2
  groupLabel  → semantic label only, e.g. house, tree, cloud
  role        → part name, e.g. wall, roof, door, window_left, window_right

Do not use parentId. Do not create nested groups. groupLabel is not unique;
use groupId for exact targeting.

Example: draw a house with a red roof, one door, and two windows:
[
  {"type":"rect","id":"house_1_wall","groupId":"house_1","groupLabel":"house","role":"wall","x":30,"y":50,"w":36,"h":28,"fill":"#D9A066","stroke":"#8B5A2B"},
  {"type":"line","id":"house_1_roof_left","groupId":"house_1","groupLabel":"house","role":"roof_left","x1":28,"y1":50,"x2":48,"y2":34,"stroke":"#C92A2A","width":4},
  {"type":"line","id":"house_1_roof_right","groupId":"house_1","groupLabel":"house","role":"roof_right","x1":48,"y1":34,"x2":68,"y2":50,"stroke":"#C92A2A","width":4},
  {"type":"rect","id":"house_1_door","groupId":"house_1","groupLabel":"house","role":"door","x":44,"y":62,"w":8,"h":16,"fill":"#6B3F1D","stroke":"#3B2412"},
  {"type":"rect","id":"house_1_window_left","groupId":"house_1","groupLabel":"house","role":"window_left","x":35,"y":56,"w":7,"h":7,"fill":"#A5D8FF","stroke":"#1C7ED6"},
  {"type":"rect","id":"house_1_window_right","groupId":"house_1","groupLabel":"house","role":"window_right","x":55,"y":56,"w":7,"h":7,"fill":"#A5D8FF","stroke":"#1C7ED6"}
]

Example: delete the house:
[{"type":"delete","id":"house_1","scope":"group"}]

Example: move the whole house a little to the right:
[{"type":"update","id":"house_1","scope":"group","transform":{"translateX":5,"translateY":0}}]

Example: scale the whole house up a little:
[{"type":"update","id":"house_1","scope":"group","transform":{"scale":1.2}}]

Example: move the whole house left and make it smaller:
[{"type":"update","id":"house_1","scope":"group","transform":{"translateX":-5,"translateY":0,"scale":0.8}}]

For fuzzy composite transforms:
- "a little" or "slightly" movement: use 5 scene-space units.
- "clearly" or "significantly" movement: use 10 scene-space units.
- "make bigger a little": use scale 1.2.
- "make smaller a little": use scale 0.8.
- If the user gives an explicit number or percent, use the user's value.

=== EDITING EXISTING OBJECTS ===
When the user is talking about something that already exists in "Current Scene",
prefer {"type":"update"} or {"type":"delete"} over creating a brand-new object.

Use the current scene to resolve references like:
  "the sun", "the roof", "the left tree", "the rightmost cloud", "the house"

Allowed object-editing patterns:
1. Change color → update fill / stroke only.
   User: "make the sun orange"
   Output: [{"type":"update","id":"sun","props":{"fill":"#FFA500","stroke":"#CC8400"}}]

2. Move an object → update position fields only.
   circle / text / rect: x, y
   line: x1, y1, x2, y2
   User: "move the house a little to the right"
   Output: [{"type":"update","id":"house_wall","props":{"x":38}},{"type":"update","id":"house_roof","props":{"x1":33,"x2":56}}]

3. Resize an object → update size fields only.
   circle: r
   rect: w, h (and y if needed to keep the bottom grounded)
   text: size
   line: width or endpoints when needed
   User: "make the left tree taller"
   Output: [{"type":"update","id":"tree_left_trunk","props":{"h":22,"y":50}}]

4. Delete an object → use delete.
   User: "delete the rightmost cloud"
   Output: [{"type":"delete","id":"cloud_right"}]

5. Delete a composite object → use one group-scoped delete with the exact groupId.
   User: "delete the house"
   Output: [{"type":"delete","id":"house_1","scope":"group"}]

Important editing rules:
- Do NOT invent new ids when the user clearly means an existing object.
- Do NOT redraw the whole scene for a small edit; only return commands for the affected object(s).
- Use absolute 0–100 values in updates, based on the current scene snapshot.
- Keep unrelated objects untouched.
- For composite object movement or resizing, prefer one group-scoped update command with transform.
- Do NOT calculate new absolute coordinates for each group member when a group transform can express the user's intent.
- Do NOT output group-scoped props. Group-scoped update commands must use transform.
- Composite color changes are not part of group transform yet; if needed, use normal object-level update commands for affected members.
- For composite object deletion, prefer one {"type":"delete","id":"<groupId>","scope":"group"} command.
- Existing scene objects without groupId still use normal single-object update/delete behavior.
- If the target object cannot be matched confidently from "Current Scene", return [].

=== PRECISE PARAMETER EDITING ===
When the user gives exact coordinates, sizes, colors, opacity, or stroke width,
use normal object-level update commands with props. Do not create a new command type.

Supported precise edits:
- Exact position:
  User: "move the sun to x=80, y=20"
  Output: [{"type":"update","id":"sun","props":{"x":80,"y":20}}]

- Relative movement:
  User: "move the roof up by 3 units"
  Output: [{"type":"update","id":"house_1_roof_left","props":{"y1":47,"y2":31}},{"type":"update","id":"house_1_roof_right","props":{"y1":31,"y2":47}}]
  Calculate absolute final values from Current Scene before returning JSON.

- Exact size:
  User: "set the rectangle width to 25 and height to 16"
  Output: [{"type":"update","id":"rect_1","props":{"w":25,"h":16}}]
  User: "change the sun radius to 6"
  Output: [{"type":"update","id":"sun","props":{"r":6}}]

- Exact color:
  User: "make the roof #C2410C"
  Output: [{"type":"update","id":"house_1_roof_left","props":{"stroke":"#C2410C"}},{"type":"update","id":"house_1_roof_right","props":{"stroke":"#C2410C"}}]
  Use fill for filled objects and stroke for line objects or outlines. CSS color strings and HEX are allowed.

- Opacity:
  User: "set the window opacity to 70%"
  Output: [{"type":"update","id":"house_1_window_left","props":{"opacity":0.7}}]
  Convert percentages to 0–1 numbers.

- Stroke:
  User: "add a white outline to the roof, width 2"
  Output: [{"type":"update","id":"house_1_roof_left","props":{"stroke":"#FFFFFF","strokeWidth":2}},{"type":"update","id":"house_1_roof_right","props":{"stroke":"#FFFFFF","strokeWidth":2}}]

Precise editing rules:
- Use the exact id from Current Scene. If no reliable target object exists, return [].
- Numeric position and size props must be finite numbers in 0–100 scene-space.
- opacity must be between 0 and 1.
- strokeWidth must be a positive number.
- Do not output id, type, groupId, groupLabel, or role inside update.props.
- Do not implement relative HSL/HSV/color-theory edits such as "increase saturation 15%",
  "make hue warmer", or "lower brightness 10%"; return [] if that is the only request.

=== NAMING RULES ===
1. Every NEW object needs a short, lowercase, underscore_separated English id:
   sun, moon, house_wall, house_roof, tree_trunk, cloud_left, window_1
2. To modify or delete, use the EXACT id shown in "Current Scene".
3. Decompose complex scenes into multiple named objects with clear ids.
4. Keep objects inside the 0–100 space; think about visual composition.
5. Use realistic CSS hex color strings (#RRGGBB).

=== CURRENT SCENE ===
${JSON.stringify(sceneObjects, null, 2)}`
}

/**
 * Try to parse a DrawCommand array from raw LLM text.
 * Strips markdown fences, then tries JSON.parse, then regex-extracts a [...] block.
 */
function parseCommands(raw) {
  // Strip optional ```json ... ``` fences
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed.commands)) return parsed.commands
    throw new Error('not an array')
  } catch {
    const match = text.match(/\[[\s\S]*]/)
    if (match) {
      try { return JSON.parse(match[0]) } catch { /* fall through */ }
    }
    throw new Error('unparseable: ' + text.slice(0, 300))
  }
}

/**
 * Compile a natural-language instruction into a DrawCommand array.
 *
 * @param {string} userText
 * @param {import('../commands/types').SceneObject[]} sceneObjects
 * @returns {Promise<{ commands: import('../commands/types').DrawCommand[], error: string|null }>}
 */
export async function compile(userText, sceneObjects) {
  const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
  if (!apiKey) {
    return {
      commands: [],
      error: '未找到 API 密钥，请在项目根目录创建 .env.local 并写入 VITE_DEEPSEEK_API_KEY=<你的密钥>。',
    }
  }

  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt(sceneObjects) },
          { role: 'user',   content: userText },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    })
  } catch (err) {
    return { commands: [], error: `网络错误，请检查网络连接：${err.message}` }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return { commands: [], error: `API 错误 ${response.status}：${body.slice(0, 200)}` }
  }

  const data = await response.json().catch(() => null)
  if (!data) return { commands: [], error: 'API 返回了无法解析的响应，请重试。' }

  const raw = data.choices?.[0]?.message?.content ?? ''
  try {
    return { commands: parseCommands(raw), error: null }
  } catch (err) {
    console.warn('[compiler] parse failed:', err.message, '\nraw:', raw)
    return { commands: [], error: 'AI 返回了格式异常的内容，请换一种说法重试。' }
  }
}
