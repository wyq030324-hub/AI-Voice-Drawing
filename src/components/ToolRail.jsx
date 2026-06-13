const TOOLS = ['选择', '矩形', '圆形', '线段', '文本']

export default function ToolRail({ isBusy, onDemo }) {
  return (
    <aside className="tool-rail" aria-label="绘图工具">
      <div className="tool-rail-section">
        <span className="rail-label">工具</span>
        {TOOLS.map((tool) => (
          <button key={tool} className="tool-button" disabled title="即将支持">
            <span className="tool-dot" aria-hidden="true" />
            {tool}
          </button>
        ))}
      </div>

      <div className="tool-rail-section debug-section">
        <span className="rail-label">调试</span>
        <button className="tool-button demo" onClick={onDemo} disabled={isBusy}>
          测试绘制
        </button>
      </div>
    </aside>
  )
}
