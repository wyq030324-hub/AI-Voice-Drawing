import { useState } from 'react'
import CommandPreview from './CommandPreview'

const TABS = [
  { id: 'preview', label: '指令预览' },
  { id: 'properties', label: '属性' },
  { id: 'layers', label: '图层' },
  { id: 'history', label: '历史记录' },
]

export default function RightPanel({
  previewCommands,
  previewCommandIndex,
  previewCaption,
  previewState,
  undoLen,
  redoLen,
  objectCount,
}) {
  const [activeTab, setActiveTab] = useState('preview')

  return (
    <aside className="right-panel">
      <div className="panel-tabs" role="tablist" aria-label="编辑器面板">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`panel-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="panel-content">
        {activeTab === 'preview' && (
          <CommandPreview
            commands={previewCommands}
            currentIndex={previewCommandIndex}
            caption={previewCaption}
            status={previewState}
          />
        )}

        {activeTab === 'properties' && (
          <EmptyPanel
            title="属性面板"
            text="后续选中对象后，可在这里编辑坐标、尺寸、颜色和描边。"
          />
        )}

        {activeTab === 'layers' && (
          <EmptyPanel
            title="图层"
            text={`当前场景包含 ${objectCount} 个对象。图层排序能力将在后续阶段接入。`}
          />
        )}

        {activeTab === 'history' && (
          <div className="history-panel">
            <h2>历史记录</h2>
            <p>历史栈仍按一次用户输入保存快照。</p>
            <dl>
              <div>
                <dt>可撤销</dt>
                <dd>{undoLen}</dd>
              </div>
              <div>
                <dt>可重做</dt>
                <dd>{redoLen}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </aside>
  )
}

function EmptyPanel({ title, text }) {
  return (
    <div className="empty-panel">
      <h2>{title}</h2>
      <p>{text}</p>
      <span>即将支持</span>
    </div>
  )
}
