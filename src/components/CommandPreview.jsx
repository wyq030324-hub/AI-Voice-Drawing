export default function CommandPreview({ commands, currentIndex, caption, status = 'idle' }) {
  if (!commands.length) return null

  const isRunning = status === 'running'
  const isDone = status === 'done'

  return (
    <aside className="command-preview">
      {caption && (
        <div className="preview-caption">已理解：{caption}</div>
      )}
      <div className={`preview-state${isDone ? ' done' : isRunning ? ' running' : ''}`}>
        {isRunning
          ? `正在执行第 ${Math.max(currentIndex + 1, 1)}/${commands.length} 步`
          : isDone
            ? '全部完成'
            : '已解析'}
      </div>
      <ol className="preview-list">
        {commands.map((cmd, i) => {
          const isActive = isRunning && i === currentIndex
          const isFinished = isDone || i < currentIndex
          return (
            <li
              key={i}
              className={`preview-item${isActive ? ' active' : isFinished ? ' done' : ''}`}
            >
              <span className="preview-text">{describeCommand(cmd)}</span>
              {isActive && <span className="preview-badge active">进行中</span>}
              {isFinished && <span className="preview-badge done">已完成</span>}
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

function describeCommand(cmd) {
  switch (cmd.type) {
    case 'circle': return `绘制圆形 "${cmd.id}"`
    case 'rect':   return `绘制矩形 "${cmd.id}"`
    case 'line':   return `绘制线段 "${cmd.id}"`
    case 'text':   return `添加文字 "${cmd.content ?? cmd.id}"`
    case 'update': return `更新 "${cmd.id}"`
    case 'delete': return `删除 "${cmd.id}"`
    case 'clear':  return '清空画布'
    default:       return `执行 ${cmd.type}`
  }
}
