const TOOLS = [
  { label: '选择', enabled: true },
  { label: '矩形', enabled: false },
  { label: '圆形', enabled: false },
  { label: '线段', enabled: false },
  { label: '文本', enabled: false },
]

export default function ToolRail({ isBusy, onDemo }) {
  return (
    <aside className="tool-rail" aria-label="绘图工具">
      <div className="tool-rail-section">
        <span className="rail-label">工具</span>
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            className={`tool-button${tool.enabled ? ' active' : ''}`}
            disabled={!tool.enabled}
            title={tool.enabled ? '当前启用' : '即将支持'}
          >
            <span className="tool-dot" aria-hidden="true" />
            {tool.label}
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
