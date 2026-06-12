import { useState, useCallback } from 'react'
import InputPanel from './components/InputPanel'
import DrawCanvas from './components/DrawCanvas'
import './App.css'

/** Hard-coded example commands for the "测试绘制" button. */
const DEMO_COMMANDS = [
  { type: 'rect',   x: 10, y: 10, w: 28, h: 18, fill: '#ffa94d', stroke: '#e67700' },
  { type: 'circle', x: 70, y: 35, r: 12, fill: '#74c0fc', stroke: '#1971c2' },
  { type: 'line',   x1: 5, y1: 68, x2: 95, y2: 68, stroke: '#2f9e44', width: 2 },
  { type: 'text',   x: 50, y: 82, content: 'PR#2 渲染测试', size: 4, fill: '#e03131' },
]

export default function App() {
  const [commands,    setCommands]    = useState([])
  const [pendingText, setPendingText] = useState('')

  const addCommands = useCallback((newCmds) => {
    setCommands((prev) => [...prev, ...newCmds])
  }, [])

  const clearCanvas = useCallback(() => {
    setCommands([])
    setPendingText('')
  }, [])

  // PR#3 will forward this text to the LLM scene compiler.
  // For now, just display it so the wiring is visible.
  const handleSubmitCommand = useCallback((text) => {
    setPendingText(text)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Voice Drawing</h1>
        <p>说出你的想法，AI 将为你绘制可编辑的矢量场景</p>
      </header>

      <main className="app-main">
        <InputPanel onSubmitCommand={handleSubmitCommand} />

        {pendingText && (
          <div className="pending-text">
            <span className="pending-label">待处理：</span>
            {pendingText}
          </div>
        )}

        <div className="canvas-controls">
          <button className="btn-demo" onClick={() => addCommands(DEMO_COMMANDS)}>
            测试绘制
          </button>
          <button className="btn-clear" onClick={clearCanvas}>
            清空画布
          </button>
        </div>

        <div className="canvas-wrap">
          <DrawCanvas commands={commands} />
        </div>
      </main>
    </div>
  )
}
