import { useEffect, useState } from 'react'
import CommandPreview from './CommandPreview'
import PropertyPanel from './PropertyPanel'

const TABS = [
  { id: 'properties', label: '属性' },
  { id: 'layers', label: '图层' },
  { id: 'preview', label: '指令' },
  { id: 'history', label: '历史' },
]

export default function RightPanel({
  previewCommands,
  previewCommandIndex,
  previewCaption,
  previewState,
  undoLen,
  redoLen,
  objectCount,
  selectedObject,
  isBusy,
  onApplyObjectUpdate,
  activeTab: controlledActiveTab,
  onTabChange,
}) {
  const [localActiveTab, setLocalActiveTab] = useState('preview')
  const activeTab = controlledActiveTab ?? localActiveTab
  const setActiveTab = onTabChange ?? setLocalActiveTab

  useEffect(() => {
    if (selectedObject) setActiveTab('properties')
  }, [selectedObject, setActiveTab])

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
          <PropertyPanel
            object={selectedObject}
            disabled={isBusy}
            onApply={onApplyObjectUpdate}
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
            <h2>历史</h2>
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
