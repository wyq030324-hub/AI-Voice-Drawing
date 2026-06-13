import { useState, useCallback, useRef, useEffect } from 'react'
import InputPanel from './components/InputPanel'
import DrawCanvas from './components/DrawCanvas'
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

export default function App() {
  const [objects,       setObjects]       = useState([])   // SceneObject[]
  const [drawingStatus, setDrawingStatus] = useState(null) // { current, total } | null
  const [llmLoading,    setLlmLoading]    = useState(false)
  const [errorMsg,      setErrorMsg]      = useState('')
  const [statusText,    setStatusText]    = useState('')

  // Ref so async handlers always read the latest scene without stale closures
  const objectsRef = useRef([])
  useEffect(() => { objectsRef.current = objects }, [objects])

  // Guards against concurrent LLM calls or draw sessions
  const busyRef = useRef(false)

  // ── Apply commands one-by-one with animated delay ──
  const runCommands = useCallback(async (commands) => {
    for (let i = 0; i < commands.length; i++) {
      setDrawingStatus({ current: i + 1, total: commands.length })
      setObjects((prev) => applyCommand(prev, commands[i]))
      if (i < commands.length - 1) {
        await new Promise((r) => setTimeout(r, STEP_DELAY_MS))
      }
    }
    setDrawingStatus(null)
  }, [])

  // ── Main entry point: called by InputPanel on voice trigger / Enter ──
  const handleSubmitCommand = useCallback(async (text) => {
    if (busyRef.current) return
    busyRef.current = true
    setErrorMsg('')
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
        await runCommands(commands)
      }
      setStatusText('')
    } finally {
      setLlmLoading(false)
      busyRef.current = false
    }
  }, [runCommands])

  // ── Demo button: animate DEMO_COMMANDS without LLM ──
  const handleDemo = useCallback(() => {
    if (busyRef.current) return
    busyRef.current = true
    setErrorMsg('')
    runCommands(DEMO_COMMANDS).finally(() => { busyRef.current = false })
  }, [runCommands])

  // ── Clear everything ──
  const clearCanvas = useCallback(() => {
    if (busyRef.current) return
    setObjects([])
    setStatusText('')
    setErrorMsg('')
  }, [])

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
          <button className="btn-demo"  onClick={handleDemo}  disabled={isBusy}>测试绘制</button>
          <button className="btn-clear" onClick={clearCanvas} disabled={isBusy}>清空画布</button>
        </div>

        <div className="canvas-wrap">
          <DrawCanvas objects={objects} />
        </div>
      </main>
    </div>
  )
}
