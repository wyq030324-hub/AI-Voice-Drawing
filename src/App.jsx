import InputPanel from './components/InputPanel'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>AI Voice Drawing</h1>
        <p>说出你的想法，AI 将为你绘制可编辑的矢量场景</p>
      </header>
      <main>
        <InputPanel />
        {/* SVG canvas — PR#3 */}
      </main>
    </div>
  )
}
