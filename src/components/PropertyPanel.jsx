import { useEffect, useMemo, useState } from 'react'
import styles from './PropertyPanel.module.css'

const FIELD_CONFIG = {
  circle: [
    { key: 'x', label: 'X 坐标', type: 'number' },
    { key: 'y', label: 'Y 坐标', type: 'number' },
    { key: 'r', label: '半径', type: 'number', positive: true },
    { key: 'fill', label: '填充色', type: 'color' },
    { key: 'stroke', label: '描边色', type: 'color' },
    { key: 'strokeWidth', label: '描边宽度', type: 'number', positive: true },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
  rect: [
    { key: 'x', label: 'X 坐标', type: 'number' },
    { key: 'y', label: 'Y 坐标', type: 'number' },
    { key: 'w', label: '宽度', type: 'number', positive: true },
    { key: 'h', label: '高度', type: 'number', positive: true },
    { key: 'fill', label: '填充色', type: 'color' },
    { key: 'stroke', label: '描边色', type: 'color' },
    { key: 'strokeWidth', label: '描边宽度', type: 'number', positive: true },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
  line: [
    { key: 'x1', label: '起点 X', type: 'number' },
    { key: 'y1', label: '起点 Y', type: 'number' },
    { key: 'x2', label: '终点 X', type: 'number' },
    { key: 'y2', label: '终点 Y', type: 'number' },
    { key: 'stroke', label: '描边色', type: 'color' },
    { key: 'strokeWidth', label: '描边宽度', type: 'number', positive: true },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
  text: [
    { key: 'x', label: 'X 坐标', type: 'number' },
    { key: 'y', label: 'Y 坐标', type: 'number' },
    { key: 'content', label: '文本内容', type: 'text' },
    { key: 'size', label: '字号', type: 'number', positive: true },
    { key: 'fill', label: '填充色', type: 'color' },
    { key: 'opacity', label: '透明度', type: 'number', min: 0, max: 1 },
  ],
}

const COLOR_PRESETS = ['#111827', '#FFFFFF', '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/
const TYPE_LABELS = {
  circle: '圆形',
  rect: '矩形',
  line: '线段',
  text: '文本',
}
const ROLE_LABELS = {
  house: '房子',
  roof: '屋顶',
  roof_left: '屋顶',
  roof_right: '屋顶',
  wall: '墙体',
  door: '门',
  window: '窗户',
  window_left: '左窗户',
  window_right: '右窗户',
  trunk: '树干',
  crown: '树冠',
  tree: '树',
  sun: '太阳',
  moon: '月亮',
  cloud: '云',
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
        <ReadOnlyRow label="对象 ID" value={object.id} />
        <ReadOnlyRow label="类型" value={TYPE_LABELS[object.type] ?? object.type} />
        {object.groupId && <ReadOnlyRow label="组合 ID" value={object.groupId} />}
        {object.groupLabel && <ReadOnlyRow label="组合标签" value={ROLE_LABELS[object.groupLabel] ?? object.groupLabel} />}
        {object.role && <ReadOnlyRow label="部件角色" value={ROLE_LABELS[object.role] ?? object.role} />}
      </section>

      <section className={styles.fields}>
        {fields.map((field) => (
          <PropertyField
            key={field.key}
            field={field}
            value={draft[field.key] ?? ''}
            disabled={disabled}
            onChange={handleChange}
          />
        ))}
      </section>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.applyButton} type="submit" disabled={disabled}>
        应用修改
      </button>
    </form>
  )
}

function PropertyField({ field, value, disabled, onChange }) {
  if (field.type === 'color') {
    return (
      <ColorField
        field={field}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    )
  }

  if (field.key === 'opacity') {
    return (
      <label className={`${styles.field} ${styles.opacityField}`}>
        <span>{field.label}</span>
        <div className={styles.opacityControls}>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={value}
            onChange={(event) => onChange(field.key, event.target.value)}
            disabled={disabled}
          />
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={value}
            onChange={(event) => onChange(field.key, event.target.value)}
            disabled={disabled}
          />
        </div>
      </label>
    )
  }

  return (
    <label className={styles.field}>
      <span>{field.label}</span>
      <input
        type={field.type}
        step={field.type === 'number' ? 'any' : undefined}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        disabled={disabled}
      />
    </label>
  )
}

function ColorField({ field, value, disabled, onChange }) {
  const colorValue = HEX_COLOR_RE.test(value) ? value : '#000000'

  return (
    <div className={`${styles.field} ${styles.colorField}`}>
      <span>{field.label}</span>
      <div className={styles.colorHeader}>
        <span
          className={styles.colorPreview}
          style={{ background: colorValue }}
          aria-hidden="true"
        />
        <input
          type="text"
          value={value}
          placeholder="#RRGGBB"
          onChange={(event) => onChange(field.key, event.target.value)}
          disabled={disabled}
        />
        <input
          className={styles.nativeColor}
          type="color"
          value={colorValue}
          onChange={(event) => onChange(field.key, event.target.value.toUpperCase())}
          disabled={disabled}
          aria-label={`${field.label}颜色选择器`}
        />
      </div>
      <div className={styles.swatches} aria-label={`${field.label}预设色板`}>
        {COLOR_PRESETS.map((color) => (
          <button
            key={`${field.key}-${color}`}
            type="button"
            className={styles.swatch}
            style={{ background: color }}
            onClick={() => onChange(field.key, color)}
            disabled={disabled}
            aria-label={`使用 ${color}`}
          />
        ))}
      </div>
    </div>
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
    if (valuesEqual(raw, getDisplayValue(object, field.key))) continue

    const parsed = parseField(field, raw)
    if (parsed.error) return parsed

    if (!valuesEqual(parsed.value, getDisplayValue(object, field.key))) {
      props[field.key] = parsed.value
    }
  }

  return { props, error: '' }
}

function parseField(field, raw) {
  if (field.type === 'color') {
    const value = String(raw ?? '').trim()
    if (!value) return { value: '', error: '' }
    if (!HEX_COLOR_RE.test(value)) return { error: `${field.label} 请输入 #RRGGBB 格式的 HEX 颜色。` }
    return { value: value.toUpperCase(), error: '' }
  }

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
