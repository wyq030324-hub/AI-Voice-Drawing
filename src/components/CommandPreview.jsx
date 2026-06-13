export default function CommandPreview({ commands, currentIndex, caption }) {
  if (!commands.length) return null

  return (
    <aside className="command-preview">
      {caption && (
        <div className="preview-caption">已理解：{caption}</div>
      )}
      <div className="preview-subtitle">正在执行：</div>
      <ol className="preview-list">
        {commands.map((cmd, i) => {
          const isActive = i === currentIndex
          const isDone   = i < currentIndex
          return (
            <li
              key={i}
              className={`preview-item${isActive ? ' active' : isDone ? ' done' : ''}`}
            >
              {describeCommand(cmd)}
              {isActive && <span className="preview-cursor"> ←</span>}
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
