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

Modify an existing object — only listed props change, others are untouched:
{"type":"update","id":"sun","props":{"fill":"#FF4500","stroke":"#CC2200"}}

Delete one object:
{"type":"delete","id":"cloud"}

Clear the entire canvas:
{"type":"clear"}

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
