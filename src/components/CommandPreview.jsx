const COLOR_KEYS = ['fill', 'stroke']
const POSITION_KEYS = ['x', 'y', 'x1', 'y1', 'x2', 'y2']
const SIZE_KEYS = ['r', 'w', 'h', 'size', 'width']

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
    case 'update': return describeUpdate(cmd)
    case 'delete': return cmd.scope === 'group' ? `删除组合 "${cmd.id}"` : `删除 "${cmd.id}"`
    case 'clear':  return '清空画布'
    default:       return `执行 ${cmd.type}`
  }
}

function describeUpdate(cmd) {
  const props = cmd.props ?? {}
  const labels = []

  if (hasAnyKey(props, COLOR_KEYS)) labels.push('修改颜色')
  if (hasAnyKey(props, POSITION_KEYS)) labels.push('移动')
  if (hasAnyKey(props, SIZE_KEYS)) labels.push('调整大小')

  if (labels.length === 0) return `更新 "${cmd.id}"`
  if (labels.length === 1) return `${labels[0]} "${cmd.id}"`
  return `编辑 "${cmd.id}"（${labels.join('、')}）`
}

function hasAnyKey(obj, keys) {
  return keys.some((key) => Object.hasOwn(obj, key))
}
