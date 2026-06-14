const LONG_VOICE_SUBMIT_WORDS = ['开始执行', '生成吧', '好啦', '好了', '执行', 'ok']
const LONG_VOICE_STOP_WORDS = ['彻底结束', '结束长语音', '停止长语音', '关闭长语音']

const PANEL_COMMANDS = [
  { tab: 'properties', patterns: ['打开属性', '显示属性', '属性'] },
  { tab: 'layers', patterns: ['打开图层', '显示图层', '图层'] },
  { tab: 'preview', patterns: ['打开指令预览', '显示指令预览', '指令预览'] },
  { tab: 'history', patterns: ['打开历史记录', '显示历史记录', '打开历史', '显示历史', '历史记录', '历史'] },
]

const SYNONYMS = {
  太阳: ['sun'],
  房子: ['house'],
  屋顶: ['roof'],
  墙体: ['wall'],
  门: ['door'],
  窗户: ['window'],
  左窗户: ['window_left'],
  右窗户: ['window_right'],
  树: ['tree'],
  树干: ['trunk'],
  树冠: ['crown'],
  云: ['cloud'],
  月亮: ['moon'],
  圆形: ['circle'],
  圆: ['circle'],
  矩形: ['rect'],
  方块: ['rect'],
  线段: ['line'],
  文字: ['text'],
}

const DISPLAY_NAMES = {
  sun: '太阳',
  moon: '月亮',
  house: '房子',
  roof: '屋顶',
  wall: '墙体',
  door: '门',
  window: '窗户',
  window_left: '左窗户',
  window_right: '右窗户',
  tree: '树',
  trunk: '树干',
  crown: '树冠',
  cloud: '云',
  circle: '圆形',
  rect: '矩形',
  line: '线段',
  text: '文本',
}

export function parseLongVoiceTranscript(text) {
  const source = String(text ?? '').trim()
  if (!source) return { action: 'wait', command: '' }

  const lower = source.toLowerCase()

  for (const stopWord of LONG_VOICE_STOP_WORDS) {
    const index = lower.indexOf(stopWord.toLowerCase())
    if (index !== -1) {
      return { action: 'stop', command: cleanCommand(source.slice(0, index)) }
    }
  }

  for (const submitWord of LONG_VOICE_SUBMIT_WORDS) {
    const index = lower.indexOf(submitWord.toLowerCase())
    if (index !== -1) {
      return { action: 'submit', command: cleanCommand(source.slice(0, index)) }
    }
  }

  return { action: 'wait', command: cleanCommand(source) }
}

export function extractLongVoiceCommand(text) {
  const result = parseLongVoiceTranscript(text)
  return result.action === 'submit' ? result.command : null
}

export function parseVoiceUiCommand(text, objects) {
  const normalized = normalize(text)
  if (!normalized) return { handled: false }

  for (const command of PANEL_COMMANDS) {
    if (command.patterns.some((pattern) => normalize(pattern) === normalized)) {
      return {
        handled: true,
        type: 'switch-tab',
        tab: command.tab,
        message: panelMessage(command.tab),
      }
    }
  }

  const propertyTarget = readPropertyTarget(normalized)
  if (!propertyTarget) return { handled: false }
  if (!propertyTarget.term) {
    return {
      handled: true,
      type: 'switch-tab',
      tab: 'properties',
      message: '已切换到属性面板',
    }
  }

  const matches = findMatchingObjects(propertyTarget.term, objects)
  if (matches.length === 0) {
    return {
      handled: true,
      type: 'object-not-found',
      message: `没有找到“${propertyTarget.displayTerm}”`,
    }
  }
  if (matches.length > 1) {
    return {
      handled: true,
      type: 'object-ambiguous',
      message: `找到多个“${propertyTarget.displayTerm}”，请说得更具体，例如左边的树或右边的窗户`,
    }
  }

  const displayName = displayObjectName(matches[0], propertyTarget.displayTerm)
  return {
    handled: true,
    type: 'show-object-properties',
    tab: 'properties',
    selectedObjectId: matches[0].id,
    message: `已选中${displayName}`,
  }
}

export function findMatchingObjects(term, objects) {
  if (!Array.isArray(objects)) return []

  const normalizedTerm = normalize(term)
  const tokens = new Set([normalizedTerm, ...(SYNONYMS[term] ?? [])].map(normalize))
  const scored = []

  for (const object of objects) {
    const score = scoreObject(object, tokens)
    if (score > 0) scored.push({ object, score })
  }

  if (!scored.length) return []
  const bestScore = Math.max(...scored.map((item) => item.score))
  return scored.filter((item) => item.score === bestScore).map((item) => item.object)
}

function scoreObject(object, tokens) {
  const candidates = [
    { value: object?.id, score: 5 },
    { value: object?.groupLabel, score: 4 },
    { value: object?.role, score: 4 },
    { value: object?.type, score: 3 },
    { value: object?.groupId, score: 2 },
  ]

  let score = 0
  for (const token of tokens) {
    if (!token) continue
    for (const candidate of candidates) {
      const value = normalize(candidate.value)
      if (!value) continue
      if (value === token || value.includes(token) || token.includes(value)) {
        score = Math.max(score, candidate.score)
      }
    }
  }
  return score
}

function readPropertyTarget(normalizedText) {
  const prefixes = ['查看', '显示', '打开']
  for (const prefix of prefixes) {
    if (!normalizedText.startsWith(prefix)) continue
    if (!normalizedText.endsWith('属性')) continue
    const rawTerm = normalizedText.slice(prefix.length, -'属性'.length)
    const term = rawTerm.replace(/的$/g, '')
    return { term, displayTerm: term || '属性' }
  }
  return null
}

function panelMessage(tab) {
  switch (tab) {
    case 'properties': return '已切换到属性面板'
    case 'layers': return '已切换到图层面板'
    case 'preview': return '已切换到指令预览'
    case 'history': return '已切换到历史记录'
    default: return '已切换面板'
  }
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s，。,.、!！?？:：;；"'“”‘’（）()]/g, '')
}

function cleanCommand(value) {
  return String(value ?? '').replace(/[，。,.、\s]+$/g, '').trim()
}

function displayObjectName(object, fallback) {
  if (fallback && fallback !== '属性') return fallback
  const candidates = [object?.role, object?.groupLabel, object?.type, object?.id]
  for (const candidate of candidates) {
    const normalized = normalize(candidate)
    if (DISPLAY_NAMES[normalized]) return DISPLAY_NAMES[normalized]
  }
  return fallback || object?.id
}
