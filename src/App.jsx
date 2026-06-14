import { useState, useCallback, useRef, useEffect } from 'react'
import DrawCanvas from './components/DrawCanvas'
import EditorTopBar from './components/EditorTopBar'
import ToolRail from './components/ToolRail'
import RightPanel from './components/RightPanel'
import BottomCommandBar from './components/BottomCommandBar'
import HomePage from './components/HomePage'
import { applyCommand } from './commands/executor'
import { compile } from './llm/compiler'
import { downloadTextFile, sceneToSvg } from './utils/exportScene'
import { parseVoiceUiCommand } from './utils/voiceUiCommands'
import './App.css'

/** Hard-coded demo commands for the "测试绘制" button; no LLM call. */
const DEMO_COMMANDS = [
  { type: 'rect',   id: 'demo_rect',   x: 10, y: 10, w: 28, h: 18, fill: '#ffa94d', stroke: '#e67700' },
  { type: 'circle', id: 'demo_circle', x: 70, y: 35, r: 12, fill: '#74c0fc', stroke: '#1971c2' },
  { type: 'line',   id: 'demo_line',   x1: 5, y1: 68, x2: 95, y2: 68, stroke: '#2f9e44', width: 2 },
  { type: 'text',   id: 'demo_text',   x: 50, y: 82, content: 'AI 语音绘图', size: 4, fill: '#e03131' },
]

const STEP_DELAY_MS = 300
const EXPORT_PNG_NAME = 'ai-voice-drawing.png'
const EXPORT_SVG_NAME = 'ai-voice-drawing.svg'

// Exact-match regexes for local history commands — avoids false positives
// e.g. "把颜色恢复为红色" should go to LLM, but "恢复" alone triggers redo
const UNDO_RE  = /^(撤销|撤回)$/
const REDO_RE  = /^(重做|恢复)$/
const CLEAR_RE = /^(清空|全部清空|清空画布)$/

export default function App() {
  const [view,                setView]                = useState('home')
  const [objects,             setObjects]             = useState([])
  const [drawingStatus,       setDrawingStatus]       = useState(null)
  const [llmLoading,          setLlmLoading]          = useState(false)
  const [errorMsg,            setErrorMsg]            = useState('')
  const [statusText,          setStatusText]          = useState('')
  const [previewCommands,     setPreviewCommands]     = useState([])
  const [previewCommandIndex, setPreviewCommandIndex] = useState(-1)
  const [previewCaption,      setPreviewCaption]      = useState('')
  const [previewState,        setPreviewState]        = useState('idle')
  const [selectedObjectId,    setSelectedObjectId]    = useState(null)
  const [rightPanelTab,       setRightPanelTab]       = useState('preview')
  const [uiNotice,            setUiNotice]            = useState('')
  const [draftCommand,        setDraftCommand]        = useState('')
  // Only lengths are state; actual stacks live in refs to avoid stale-closure issues
  const [undoLen, setUndoLen] = useState(0)
  const [redoLen, setRedoLen] = useState(0)

  const objectsRef   = useRef([])
  const undoStackRef = useRef([]) // SceneObject[][]
  const redoStackRef = useRef([]) // SceneObject[][]
  const busyRef      = useRef(false)
  const canvasRef    = useRef(null)

  useEffect(() => { objectsRef.current = objects }, [objects])

  useEffect(() => {
    if (!selectedObjectId) return
    if (!objects.some((obj) => obj.id === selectedObjectId)) {
      setSelectedObjectId(null)
    }
  }, [objects, selectedObjectId])

  // Save current scene as one undo snapshot and clear redo.
  const pushSnapshot = useCallback(() => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(objectsRef.current)))
    redoStackRef.current = []
    setUndoLen(undoStackRef.current.length)
    setRedoLen(0)
  }, [])

  const handleUndo = useCallback(() => {
    if (busyRef.current || undoStackRef.current.length === 0) return
    const snapshot = undoStackRef.current.pop()
    redoStackRef.current.push(JSON.parse(JSON.stringify(objectsRef.current)))
    objectsRef.current = snapshot
    setObjects(snapshot)
    setUndoLen(undoStackRef.current.length)
    setRedoLen(redoStackRef.current.length)
  }, [])

  const handleRedo = useCallback(() => {
    if (busyRef.current || redoStackRef.current.length === 0) return
    const snapshot = redoStackRef.current.pop()
    undoStackRef.current.push(JSON.parse(JSON.stringify(objectsRef.current)))
    objectsRef.current = snapshot
    setObjects(snapshot)
    setUndoLen(undoStackRef.current.length)
    setRedoLen(redoStackRef.current.length)
  }, [])

  // Apply commands one by one with animated delay.
  // Each step updates objectsRef directly so the next command sees the latest scene.
  const runCommands = useCallback(async (commands) => {
    setPreviewState('running')
    for (let i = 0; i < commands.length; i++) {
      setPreviewCommandIndex(i)
      setDrawingStatus({ current: i + 1, total: commands.length })
      const newObjs = applyCommand(objectsRef.current, commands[i])
      objectsRef.current = newObjs
      setObjects(newObjs)
      await new Promise(r => setTimeout(r, STEP_DELAY_MS))
    }
    setDrawingStatus(null)
    setPreviewCommandIndex(-1)
    setPreviewState('done')
  }, [])

  const handleClearCanvas = useCallback(() => {
    if (busyRef.current || objectsRef.current.length === 0) return
    pushSnapshot()
    objectsRef.current = []
    setObjects([])
    setSelectedObjectId(null)
    setStatusText('')
    setErrorMsg('')
  }, [pushSnapshot])

  const handleExportPng = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) {
      setErrorMsg('当前画布尚未准备好，暂时无法导出 PNG。')
      return
    }

    try {
      if (typeof canvas.toBlob !== 'function') {
        const fallbackLink = document.createElement('a')
        fallbackLink.href = canvas.toDataURL('image/png')
        fallbackLink.download = EXPORT_PNG_NAME
        document.body.appendChild(fallbackLink)
        fallbackLink.click()
        fallbackLink.remove()
        setErrorMsg('')
        setUiNotice('已导出 PNG 文件')
        return
      }

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (nextBlob) resolve(nextBlob)
          else reject(new Error('empty-blob'))
        }, 'image/png')
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = EXPORT_PNG_NAME
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setErrorMsg('')
      setUiNotice('已导出 PNG 文件')
    } catch {
      setErrorMsg('导出 PNG 失败，请稍后重试。')
    }
  }, [])

  const handleExportSvg = useCallback(() => {
    try {
      const svg = sceneToSvg(objectsRef.current)
      downloadTextFile(EXPORT_SVG_NAME, svg, 'image/svg+xml;charset=utf-8')
      setErrorMsg('')
      setUiNotice('已导出 SVG 文件')
    } catch {
      setErrorMsg('导出 SVG 失败，请稍后重试。')
    }
  }, [])

  const applyDirectObjectUpdate = useCallback((id, props) => {
    if (busyRef.current || !id || !props || typeof props !== 'object') return false

    const current = objectsRef.current.find((obj) => obj.id === id)
    if (!current) {
      setSelectedObjectId(null)
      return false
    }

    const {
      id: _ignoredId,
      type: _ignoredType,
      groupId: _ignoredGroupId,
      groupLabel: _ignoredGroupLabel,
      role: _ignoredRole,
      ...safeProps
    } = props

    const changedProps = Object.fromEntries(
      Object.entries(safeProps).filter(([key, value]) => current[key] !== value)
    )

    if (Object.keys(changedProps).length === 0) return false

    pushSnapshot()
    const next = applyCommand(objectsRef.current, { type: 'update', id, props: changedProps })
    objectsRef.current = next
    setObjects(next)
    setErrorMsg('')
    setUiNotice('已应用属性修改')
    return true
  }, [pushSnapshot])

  const handleSubmitCommand = useCallback(async (text) => {
    if (busyRef.current) return

    const trimmed = text.trim()

    const uiCommand = parseVoiceUiCommand(trimmed, objectsRef.current)
    if (uiCommand.handled) {
      setErrorMsg('')
      setStatusText('')
      setUiNotice(uiCommand.message)
      if (uiCommand.tab) setRightPanelTab(uiCommand.tab)
      if (uiCommand.selectedObjectId) setSelectedObjectId(uiCommand.selectedObjectId)
      return
    }

    // Local history commands: zero latency, no LLM.
    if (UNDO_RE.test(trimmed))  { handleUndo();        return }
    if (REDO_RE.test(trimmed))  { handleRedo();        return }
    if (CLEAR_RE.test(trimmed)) { handleClearCanvas(); return }

    busyRef.current = true
    setErrorMsg('')
    setUiNotice('')
    setStatusText(text)
    setLlmLoading(true)

    try {
      const { commands, error } = await compile(text, objectsRef.current)
      setLlmLoading(false)

      if (error) {
        setErrorMsg(error)
        setStatusText('')
        return
      }

      if (commands.length) {
        // One snapshot for the entire submission, not per command.
        pushSnapshot()
        setPreviewCommands(commands)
        setPreviewCaption(text)
        await runCommands(commands)
      }
      setStatusText('')
    } finally {
      setLlmLoading(false)
      busyRef.current = false
    }
  }, [runCommands, handleUndo, handleRedo, handleClearCanvas, pushSnapshot])

  const handleDemo = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    setErrorMsg('')
    pushSnapshot()
    setPreviewCommands(DEMO_COMMANDS)
    setPreviewCaption('测试绘制')
    runCommands(DEMO_COMMANDS).finally(() => {
      busyRef.current = false
    })
  }, [runCommands, pushSnapshot])

  const isBusy = llmLoading || drawingStatus !== null
  const selectedObject = objects.find((obj) => obj.id === selectedObjectId) ?? null
  const statusLabel = drawingStatus
    ? `正在执行第 ${drawingStatus.current}/${drawingStatus.total} 步`
    : llmLoading
      ? '正在调用 AI'
      : errorMsg
        ? '发生错误'
        : uiNotice
          ? '界面已更新'
        : previewState === 'done' && previewCommands.length
          ? '全部完成'
          : '等待指令'

  if (view === 'home') {
    return <HomePage onStart={() => setView('editor')} />
  }

  return (
    <div className="app editor-app">
      <EditorTopBar
        isBusy={isBusy}
        undoLen={undoLen}
        redoLen={redoLen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClearCanvas}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onHome={() => setView('home')}
      />

      <main className="editor-main">
        <ToolRail isBusy={isBusy} onDemo={handleDemo} />

        <section className="canvas-workspace" aria-label="画布区域">
          <div className="canvas-status-row">
            <div className={`editor-status${llmLoading || drawingStatus || uiNotice ? ' active' : ''}${errorMsg ? ' error' : ''}`}>
              <span className="status-kicker">{statusLabel}</span>
              {(statusText || uiNotice) && <span className="status-detail">{statusText || uiNotice}</span>}
            </div>
            <div className="scene-counter">{objects.length} 个对象</div>
          </div>

          {errorMsg && <div className="error-msg">{errorMsg}</div>}

          <div className="canvas-shell">
            {objects.length === 0 && !isBusy && (
              <div className="canvas-empty-state">
                <span className="empty-kicker">对象级画布</span>
                <strong>说出画面，继续编辑每个对象</strong>
                <span>试试：“画一座带红色屋顶的小房子”</span>
                <div className="canvas-empty-prompts" aria-hidden="true">
                  <span>生成五星红旗</span>
                  <span>查看房子门的属性</span>
                  <span>导出 SVG</span>
                </div>
              </div>
            )}
            <div className="canvas-wrap">
              <DrawCanvas
                objects={objects}
                selectedObjectId={selectedObjectId}
                onSelectObject={setSelectedObjectId}
                canvasRef={canvasRef}
              />
            </div>
          </div>
        </section>

        <RightPanel
          previewCommands={previewCommands}
          previewCommandIndex={previewCommandIndex}
          previewCaption={previewCaption}
          previewState={previewState}
          undoLen={undoLen}
          redoLen={redoLen}
          objectCount={objects.length}
          selectedObject={selectedObject}
          isBusy={isBusy}
          onApplyObjectUpdate={applyDirectObjectUpdate}
          activeTab={rightPanelTab}
          onTabChange={setRightPanelTab}
        />
      </main>

      <BottomCommandBar
        disabled={isBusy}
        onSubmitCommand={handleSubmitCommand}
        statusLabel={statusLabel}
        onNotice={setUiNotice}
        draftValue={draftCommand}
        onDraftChange={setDraftCommand}
      />
    </div>
  )
}
