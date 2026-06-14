import { useEffect, useMemo, useState } from 'react'
import styles from './PropertyPanel.module.css'

const FIELD_CONFIG = {
  circle: [
    { key: 'x', label: 'x', type: 'number' },
    { key: 'y', label: 'y', type: 'number' },
    { key: 'r', label: '半径', type: 'number', positive: true },
    { key: 'fill', label: '填充色', type: 'text' },
    { key: 'stroke', label: '描边色', type: 'text' },
    { key: 'strokeWidth', label: '描边宽度', type: 'number', positive: true },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
  rect: [
    { key: 'x', label: 'x', type: 'number' },
    { key: 'y', label: 'y', type: 'number' },
    { key: 'w', label: '宽度', type: 'number', positive: true },
    { key: 'h', label: '高度', type: 'number', positive: true },
    { key: 'fill', label: '填充色', type: 'text' },
    { key: 'stroke', label: '描边色', type: 'text' },
    { key: 'strokeWidth', label: '描边宽度', type: 'number', positive: true },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
  line: [
    { key: 'x1', label: 'x1', type: 'number' },
    { key: 'y1', label: 'y1', type: 'number' },
    { key: 'x2', label: 'x2', type: 'number' },
    { key: 'y2', label: 'y2', type: 'number' },
    { key: 'stroke', label: '描边色', type: 'text' },
    { key: 'strokeWidth', label: '描边宽度', type: 'number', positive: true },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
  text: [
    { key: 'x', label: 'x', type: 'number' },
    { key: 'y', label: 'y', type: 'number' },
    { key: 'content', label: '文本', type: 'text' },
    { key: 'size', label: '字号', type: 'number', positive: true },
    { key: 'fill', label: '填充色', type: 'text' },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value)

export default function PropertyPanel({ object, disabled = false, onApply }) {
  const fields = useMemo(() => FIELD_CONFIG[object?.type] ?? [], [object?.type])
  const [draft, setDraft] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!object) {
      setDraft({})
      setError('')
      return
    }

    setDraft(buildDraft(object, FIELD_CONFIG[object.type] ?? []))
    setError('')
  }, [object])

  if (!object) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <h2>未选择对象</h2>
          <p>点击画布中的单个图形后，可以在这里精确调整坐标、尺寸、颜色、透明度和描边。</p>
        </div>
      </div>
    )
  }

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (disabled) return

    const result = buildProps(object, fields, draft)
    if (result.error) {
      setError(result.error)
      return
    }

    if (Object.keys(result.props).length === 0) {
      setError('没有检测到实际变化。')
      return
    }

    const applied = onApply?.(object.id, result.props)
    if (!applied) {
      setError('没有写入变化，可能对象已不存在或当前正在执行命令。')
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit}>
      <section className={styles.identity}>
        <h2>属性</h2>
        <ReadOnlyRow label="id" value={object.id} />
        <ReadOnlyRow label="type" value={object.type} />
        {object.groupId && <ReadOnlyRow label="groupId" value={object.groupId} />}
        {object.groupLabel && <ReadOnlyRow label="groupLabel" value={object.groupLabel} />}
        {object.role && <ReadOnlyRow label="role" value={object.role} />}
      </section>

      <section className={styles.fields}>
        {fields.map((field) => (
          <label key={field.key} className={styles.field}>
            <span>{field.label}</span>
            <input
              type={field.type}
              step={field.type === 'number' ? 'any' : undefined}
              value={draft[field.key] ?? ''}
              onChange={(event) => handleChange(field.key, event.target.value)}
              disabled={disabled}
            />
          </label>
        ))}
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.applyButton} type="submit" disabled={disabled}>
        应用修改
      </button>
    </form>
  )
}

function ReadOnlyRow({ label, value }) {
  return (
    <div className={styles.readOnlyRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function buildDraft(object, fields) {
  return fields.reduce((next, field) => {
    next[field.key] = String(getDisplayValue(object, field.key))
    return next
  }, {})
}

function getDisplayValue(object, key) {
  if (key === 'opacity') return object.opacity ?? 1
  if (key === 'strokeWidth') return object.strokeWidth ?? object.width ?? 1
  return object[key] ?? ''
}

function buildProps(object, fields, draft) {
  const props = {}

  for (const field of fields) {
    const raw = draft[field.key]
    const parsed = parseField(field, raw)
    if (parsed.error) return parsed

    if (!valuesEqual(parsed.value, getDisplayValue(object, field.key))) {
      props[field.key] = parsed.value
    }
  }

  return { props, error: '' }
}

function parseField(field, raw) {
  if (field.type === 'text') return { value: raw ?? '', error: '' }

  const value = Number(raw)
  if (!isFiniteNumber(value)) {
    return { error: `${field.label} 必须是有效数字。` }
  }
  if (field.positive && value <= 0) {
    return { error: `${field.label} 必须大于 0。` }
  }
  if (field.min !== undefined && value < field.min) {
    return { error: `${field.label} 不能小于 ${field.min}。` }
  }
  if (field.max !== undefined && value > field.max) {
    return { error: `${field.label} 不能大于 ${field.max}。` }
  }

  return { value, error: '' }
}

function valuesEqual(a, b) {
  if (typeof a === 'number' || typeof b === 'number') {
    return Number(a) === Number(b)
  }
  return String(a) === String(b)
}
