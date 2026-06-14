export default function ToolRail({ isBusy, onDemo }) {
  return (
    <aside className="tool-rail" aria-label="绘图工具">
      <div className="tool-rail-section">
        <span className="rail-label">模式</span>
        <button className="tool-button active" title="当前启用">
          <span className="tool-dot" aria-hidden="true" />
          选择模式
        </button>
      </div>

      <div className="tool-rail-section voice-first-section">
        <span className="rail-label">语音绘图</span>
        <p className="rail-copy">用语音描述图形、位置和属性。</p>
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
