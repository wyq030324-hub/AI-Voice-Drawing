import InputPanel from './InputPanel'

export default function BottomCommandBar({ disabled, onSubmitCommand, statusLabel, onNotice }) {
  return (
    <footer className="bottom-command-bar">
      <div className="command-status">
        <span className={`status-dot${disabled ? ' busy' : ''}`} aria-hidden="true" />
        {statusLabel}
      </div>
      <InputPanel onSubmitCommand={onSubmitCommand} disabled={disabled} onNotice={onNotice} />
    </footer>
  )
}
