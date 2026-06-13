import { useState, useCallback, useRef, useEffect } from 'react'
import InputPanel from './components/InputPanel'
import DrawCanvas from './components/DrawCanvas'
import CommandPreview from './components/CommandPreview'
import { applyCommand } from './commands/executor'
import { compile } from './llm/compiler'
import './App.css'

/** Hard-coded demo commands for the "测试绘制" button — no LLM call. */
const DEMO_COMMANDS = [
  { type: 'rect',   id: 'demo_rect',   x: 10, y: 10, w: 28, h: 18, fill: '#ffa94d', stroke: '#e67700' },
  { type: 'circle', id: 'demo_circle', x: 70, y: 35, r: 12, fill: '#74c0fc', stroke: '#1971c2' },
  { type: 'line',   id: 'demo_line',   x1: 5, y1: 68, x2: 95, y2: 68, stroke: '#2f9e44', width: 2 },
  { type: 'text',   id: 'demo_text',   x: 50, y: 82, content: 'PR#3 LLM 接入', size: 4, fill: '#e03131' },
]

const STEP_DELAY_MS = 300

// Exact-match regexes for local history commands — avoids false positives
// e.g. "把颜色恢复为红色" should go to LLM, but "恢复" alone triggers redo
const UNDO_RE  = /^(撤销|撤回)$/
const REDO_RE  = /^(重做|恢复)$/
const CLEAR_RE = /^(清空|全部清空|清空画布)$/

export default function App() {
  const [objects,             setObjects]             = useState([])
  const [drawingStatus,       setDrawingStatus]       = useState(null)
  const [llmLoading,          setLlmLoading]          = useState(false)
  const [errorMsg,            setErrorMsg]            = useState('')
  const [statusText,          setStatusText]          = useState('')
  const [pendingCommands,     setPendingCommands]     = useState([])
  const [pendingCommandIndex, setPendingCommandIndex] = useState(-1)
  // Only lengths are state; actual stacks live in refs to avoid stale-closure issues
  const [undoLen, setUndoLen] = useState(0)
  const [redoLen, setRedoLen] = useState(0)

  const objectsRef   = useRef([])
  const undoStackRef = useRef([]) // SceneObject[][]
  const redoStackRef = useRef([]) // SceneObject[][]
  const busyRef      = useRef(false)

  useEffect(() => { objectsRef.current = objects }, [objects])

  // ── Save current scene as undo snapshot, clear redo ──
  const pushSnapshot = useCallback(() => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(objectsRef.current)))
    redoStackRef.current = []
    setUndoLen(undoStackRef.current.length)
    setRedoLen(0)
  }, [])

  // ── Undo / Redo ──
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

  // ── Apply commands one-by-one with animated delay ──
  // Each step updates objectsRef directly so the next applyCommand sees the latest scene.
  // Snapshot is NOT taken here — caller does one pushSnapshot() before invoking runCommands().
  const runCommands = useCallback(async (commands) => {
    for (let i = 0; i < commands.length; i++) {
      setPendingCommandIndex(i)
      setDrawingStatus({ current: i + 1, total: commands.length })
      const newObjs = applyCommand(objectsRef.current, commands[i])
      objectsRef.current = newObjs
      setObjects(newObjs)
      await new Promise(r => setTimeout(r, STEP_DELAY_MS))
    }
    setDrawingStatus(null)
    setPendingCommandIndex(-1)
  }, [])

  // ── Clear canvas (undo-aware) ──
  const handleClearCanvas = useCallback(() => {
    if (busyRef.current) return
    pushSnapshot()
    objectsRef.current = []
    setObjects([])
    setStatusText('')
    setErrorMsg('')
  }, [pushSnapshot])

  // ── Main entry point: called by InputPanel on voice trigger / Enter ──
  const handleSubmitCommand = useCallback(async (text) => {
    if (busyRef.current) return

    const trimmed = text.trim()

    // Local history commands — zero latency, no LLM
    if (UNDO_RE.test(trimmed))  { handleUndo();        return }
    if (REDO_RE.test(trimmed))  { handleRedo();        return }
    if (CLEAR_RE.test(trimmed)) { handleClearCanvas(); return }

    busyRef.current = true
    setErrorMsg('')
    setStatusText(text)
    setLlmLoading(true)
    setPendingCommands([])
    setPendingCommandIndex(-1)

    try {
      const { commands, error } = await compile(text, objectsRef.current)
      setLlmLoading(false)

      if (error) {
        setErrorMsg(error)
        setStatusText('')
        return
      }

      if (commands.length) {
        // One snapshot for the entire submission — not per-command
        pushSnapshot()
        setPendingCommands(commands)
        await runCommands(commands)
        setPendingCommands([])
      }
      setStatusText('')
    } finally {
      setLlmLoading(false)
      busyRef.current = false
    }
  }, [runCommands, handleUndo, handleRedo, handleClearCanvas, pushSnapshot])

  // ── Demo button: animate DEMO_COMMANDS without LLM ──
  const handleDemo = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    setErrorMsg('')
    pushSnapshot()
    setPendingCommands(DEMO_COMMANDS)
    runCommands(DEMO_COMMANDS).finally(() => {
      busyRef.current = false
      setPendingCommands([])
    })
  }, [runCommands, pushSnapshot])

  const isBusy = llmLoading || drawingStatus !== null

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Voice Drawing</h1>
        <p>说出你的想法，AI 将为你绘制可编辑的矢量场景</p>
      </header>

      <main className="app-main">
        <InputPanel onSubmitCommand={handleSubmitCommand} disabled={isBusy} />

        {/* Status bar — shown while LLM is thinking or while drawing */}
        {(llmLoading || drawingStatus) && (
          <div className="status-bar">
            {drawingStatus
              ? `正在绘制：第 ${drawingStatus.current}/${drawingStatus.total} 步${statusText ? ` — ${statusText}` : ''}`
              : `AI 理解中…${statusText ? ` — ${statusText}` : ''}`}
          </div>
        )}

        {errorMsg && <div className="error-msg">{errorMsg}</div>}

        <div className="canvas-controls">
          <button className="btn-demo"  onClick={handleDemo}        disabled={isBusy}>测试绘制</button>
          <button className="btn-undo"  onClick={handleUndo}        disabled={isBusy || undoLen === 0}>撤销</button>
          <button className="btn-redo"  onClick={handleRedo}        disabled={isBusy || redoLen === 0}>重做</button>
          <button className="btn-clear" onClick={handleClearCanvas} disabled={isBusy}>清空画布</button>
        </div>

        <div className="canvas-section">
          <div className="canvas-wrap">
            <DrawCanvas objects={objects} />
          </div>
          <CommandPreview
            commands={pendingCommands}
            currentIndex={pendingCommandIndex}
            caption={statusText}
          />
        </div>
      </main>
    </div>
  )
}
