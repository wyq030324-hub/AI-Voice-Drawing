export default function EditorTopBar({
  isBusy,
  undoLen,
  redoLen,
  onUndo,
  onRedo,
  onClear,
}) {
  return (
    <header className="editor-topbar">
      <div className="brand-block">
        <div className="brand-mark">AV</div>
        <div>
          <h1>AI-Voice-Drawing</h1>
          <p>Voice-first editable canvas</p>
        </div>
      </div>

      <nav className="topbar-actions" aria-label="编辑器操作">
        <button className="toolbar-button" onClick={onUndo} disabled={isBusy || undoLen === 0}>
          撤销
        </button>
        <button className="toolbar-button" onClick={onRedo} disabled={isBusy || redoLen === 0}>
          重做
        </button>
        <button className="toolbar-button danger" onClick={onClear} disabled={isBusy}>
          清空
        </button>
        <span className="toolbar-divider" aria-hidden="true" />
        <button className="toolbar-button ghost" disabled title="即将支持">
          网格
        </button>
        <button className="toolbar-button ghost" disabled title="即将支持">
          吸附
        </button>
        <button className="toolbar-button ghost" disabled title="即将支持">
          导出 PNG
        </button>
        <button className="toolbar-button ghost" disabled title="即将支持">
          导出 SVG
        </button>
      </nav>
    </header>
  )
}
