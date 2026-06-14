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
  房屋: ['house'],
  屋子: ['house'],
  屋顶: ['roof'],
  房顶: ['roof'],
  墙体: ['wall'],
  门: ['door'],
  房门: ['door'],
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
  文本: ['text'],
  五星红旗: ['china_flag', 'flag'],
  中国国旗: ['china_flag', 'flag'],
  国旗: ['flag'],
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
  flag: '国旗',
  china_flag: '五星红旗',
}

const GROUP_CONCEPTS = [
  { display: '五星红旗', terms: ['五星红旗', '中国国旗', '国旗'], tokens: ['china_flag', 'flag'] },
  { display: '房子', terms: ['房子', '房屋', '屋子'], tokens: ['house'] },
  { display: '树', terms: ['树'], tokens: ['tree'] },
  { display: '云', terms: ['云'], tokens: ['cloud'] },
]

const PART_CONCEPTS = [
  { display: '左窗户', terms: ['左窗户', '左边窗户', '左侧窗户'], tokens: ['window_left'] },
  { display: '右窗户', terms: ['右窗户', '右边窗户', '右侧窗户'], tokens: ['window_right'] },
  { display: '屋顶', terms: ['屋顶', '房顶'], tokens: ['roof', 'roof_left', 'roof_right'] },
  { display: '墙体', terms: ['墙体', '墙'], tokens: ['wall'] },
  { display: '门', terms: ['房门', '门'], tokens: ['door'] },
  { display: '窗户', terms: ['窗户'], tokens: ['window'] },
  { display: '树干', terms: ['树干'], tokens: ['trunk'] },
  { display: '树冠', terms: ['树冠'], tokens: ['crown'] },
]

const OBJECT_CONCEPTS = [
  { display: '太阳', terms: ['太阳'], tokens: ['sun'] },
  { display: '月亮', terms: ['月亮'], tokens: ['moon'] },
  { display: '圆形', terms: ['圆形', '圆'], tokens: ['circle'] },
  { display: '矩形', terms: ['矩形', '方块'], tokens: ['rect'] },
  { display: '线段', terms: ['线段'], tokens: ['line'] },
  { display: '文本', terms: ['文本', '文字'], tokens: ['text'] },
]

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

  const targetSpec = buildTargetSpec(propertyTarget.term)
  const displayTerm = targetSpec.displayTerm || propertyTarget.displayTerm
  const matches = findMatchingObjects(propertyTarget.term, objects)
  if (matches.length === 0) {
    return {
      handled: true,
      type: 'object-not-found',
      message: `没有找到“${displayTerm}”`,
    }
  }
  if (matches.length > 1) {
    return {
      handled: true,
      type: 'object-ambiguous',
      message: `找到多个“${displayTerm}”，请说得更具体，例如左边的树或右边的窗户`,
    }
  }

  const displayName = displayObjectName(matches[0], displayTerm)
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

  const targetSpec = buildTargetSpec(term)
  if (targetSpec.groupTokens.length && targetSpec.partTokens.length) {
    return objects.filter((object) => (
      matchesGroupedObject(object, targetSpec.groupTokens) &&
      matchesObjectPart(object, targetSpec.partTokens)
    ))
  }

  const tokens = new Set(targetSpec.tokens.map(normalize))
  const exactMatches = objects.filter((object) => (
    [...tokens].some((token) => objectHasExactToken(object, token))
  ))
  if (exactMatches.length) return exactMatches

  const scored = []

  for (const object of objects) {
    const score = scoreObject(object, tokens)
    if (score > 0) scored.push({ object, score })
  }

  if (!scored.length) return []
  const bestScore = Math.max(...scored.map((item) => item.score))
  return scored.filter((item) => item.score === bestScore).map((item) => item.object)
}

function objectHasExactToken(object, token) {
  if (!token) return false
  return [object?.id, object?.groupLabel, object?.role, object?.type, object?.groupId]
    .map(normalize)
    .some((value) => value === token)
}

function buildTargetSpec(term) {
  const compactTerm = normalizeTargetTerm(term)
  const group = findConcept(compactTerm, GROUP_CONCEPTS)
  const part = findConcept(compactTerm, PART_CONCEPTS)

  if (group && part) {
    return {
      displayTerm: `${group.display}的${part.display}`,
      groupTokens: expandConceptTokens(compactTerm, group),
      partTokens: expandConceptTokens(part.display, part),
      tokens: expandConceptTokens(compactTerm, group, part),
    }
  }

  const concept = part || group || findConcept(compactTerm, OBJECT_CONCEPTS)
  return {
    displayTerm: concept?.display || compactTerm || term,
    groupTokens: [],
    partTokens: [],
    tokens: expandConceptTokens(compactTerm, concept),
  }
}

function normalizeTargetTerm(term) {
  return normalize(term)
    .replace(/里的/g, '')
    .replace(/里面的/g, '')
    .replace(/中的/g, '')
    .replace(/中间的/g, '')
    .replace(/的/g, '')
    .replace(/里/g, '')
}

function findConcept(compactTerm, concepts) {
  return concepts
    .flatMap((concept) => concept.terms.map((term) => ({ concept, term: normalizeTargetTerm(term) })))
    .filter((item) => item.term && compactTerm.includes(item.term))
    .sort((a, b) => b.term.length - a.term.length)[0]?.concept ?? null
}

function expandConceptTokens(term, ...concepts) {
  const tokens = new Set([normalize(term)])
  for (const concept of concepts) {
    if (!concept) continue
    for (const item of concept.terms) tokens.add(normalizeTargetTerm(item))
    for (const item of concept.tokens) tokens.add(normalize(item))
  }
  const synonymTokens = SYNONYMS[term] ?? SYNONYMS[normalize(term)] ?? []
  for (const item of synonymTokens) tokens.add(normalize(item))
  return [...tokens].filter(Boolean)
}

function matchesGroupedObject(object, tokens) {
  const values = [object?.groupId, object?.groupLabel, object?.id]
  return tokens.some((token) => matchesAnyValue(token, values))
}

function matchesObjectPart(object, tokens) {
  const values = [object?.role, object?.id, object?.type]
  return tokens.some((token) => matchesAnyValue(token, values))
}

function matchesAnyValue(token, values) {
  const normalizedToken = normalize(token)
  if (!normalizedToken) return false
  return values.some((value) => {
    const normalizedValue = normalize(value)
    return normalizedValue &&
      (normalizedValue === normalizedToken ||
        normalizedValue.includes(normalizedToken) ||
        normalizedToken.includes(normalizedValue))
  })
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
