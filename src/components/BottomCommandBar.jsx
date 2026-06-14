import InputPanel from './InputPanel'

export default function BottomCommandBar({
  disabled,
  onSubmitCommand,
  statusLabel,
  onNotice,
  draftValue,
  onDraftChange,
  examples = [],
  onPickExample,
}) {
  return (
    <footer className="bottom-command-bar">
      <div className="command-status">
        <span className={`status-dot${disabled ? ' busy' : ''}`} aria-hidden="true" />
        {statusLabel}
      </div>
      <div className="command-entry">
        {examples.length > 0 && (
          <div className="command-examples" aria-label="示例指令">
            <span className="examples-label">示例指令</span>
            <div className="example-chip-list">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="example-chip"
                  onClick={() => onPickExample?.(example)}
                  disabled={disabled}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        <InputPanel
          onSubmitCommand={onSubmitCommand}
          disabled={disabled}
          onNotice={onNotice}
          draftValue={draftValue}
          onDraftChange={onDraftChange}
        />
      </div>
    </footer>
  )
}
