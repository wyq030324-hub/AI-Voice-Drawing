import InputPanel from './InputPanel'

export default function BottomCommandBar({
  disabled,
  onSubmitCommand,
  statusLabel,
  onNotice,
  draftValue,
  onDraftChange,
}) {
  return (
    <footer className="bottom-command-bar">
      <div className="command-status">
        <span className={`status-dot${disabled ? ' busy' : ''}`} aria-hidden="true" />
        {statusLabel}
      </div>
      <div className="command-entry">
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
