import { useEffect, useRef, useCallback } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import styles from './InputPanel.module.css'

// Spoken words that trigger automatic submission.
// Matching is case-insensitive; the trigger word is stripped from the submitted text.
const SUBMIT_TRIGGERS = ['提交', '确认', '开始画', 'ok', '好了']

// Returns the text with the first matching trigger word removed,
// or null if no trigger was found.
function extractTrigger(text) {
  const lower = text.toLowerCase()
  for (const trigger of SUBMIT_TRIGGERS) {
    const idx = lower.indexOf(trigger.toLowerCase())
    if (idx !== -1) {
      return (text.slice(0, idx) + text.slice(idx + trigger.length)).trim()
    }
  }
  return null
}

export default function InputPanel({ onSubmitCommand, disabled = false }) {
  const { isSupported, isListening, interimText, finalText, error, start, stop, clearTranscript } =
    useSpeechRecognition()
  const textRef = useRef(null)

  // Speech is unavailable when the API is missing OR the user denied mic access
  const speechUnavailable = !isSupported || error === 'permission-denied'

  // Auto-focus + visually highlight text input whenever speech becomes unavailable
  useEffect(() => {
    if (speechUnavailable) textRef.current?.focus()
  }, [speechUnavailable])

  // Stop active voice recognition while parent is busy (LLM / drawing in progress)
  useEffect(() => {
    if (disabled && isListening) stop()
  }, [disabled, isListening, stop])

  // Auto-submit when a trigger word appears in the accumulated final transcript
  useEffect(() => {
    if (!finalText) return
    const cleaned = extractTrigger(finalText)
    if (cleaned === null) return  // no trigger found
    stop()
    clearTranscript()
    if (cleaned) onSubmitCommand(cleaned)  // skip empty-string submit (trigger-word-only utterance)
  }, [finalText, stop, clearTranscript, onSubmitCommand])

  const handleVoiceSubmit = useCallback(() => {
    const text = finalText.trim()
    if (!text) return
    onSubmitCommand(text)
    clearTranscript()
  }, [finalText, clearTranscript, onSubmitCommand])

  const handleTextKey = useCallback((e) => {
    if (disabled || e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    const text = e.currentTarget.value.trim()
    if (!text) return
    onSubmitCommand(text)
    e.currentTarget.value = ''
  }, [disabled, onSubmitCommand])

  return (
    <div className={styles.panel}>
      {/* ── Voice section (only rendered when the API exists) ── */}
      {isSupported && (
        <section className={styles.voiceSection}>
          <div className={styles.controls}>
            <button
              className={isListening ? styles.btnStop : styles.btnStart}
              onClick={isListening ? stop : start}
              disabled={disabled && !isListening}
            >
              {isListening ? '⏹ 停止' : '🎤 开始识别'}
            </button>

            {/* Submit appears after the user stops and there is confirmed final text */}
            {finalText.trim() && !isListening && (
              <button className={styles.btnSubmit} onClick={handleVoiceSubmit} disabled={disabled}>
                提交
              </button>
            )}
          </div>

          {(finalText || interimText) && (
            <p className={styles.transcript}>
              {/* Final results: dark */}
              {finalText && <span className={styles.final}>{finalText}</span>}
              {/* Interim results: light + italic to signal "still processing" */}
              {interimText && <span className={styles.interim}>{interimText}</span>}
            </p>
          )}
        </section>
      )}

      {/* ── Error / unavailability notice ── */}
      {(!isSupported || error) && (
        <div className={styles.notice}>
          {!isSupported
            ? '当前浏览器不支持语音识别，请使用 Chrome 或 Edge。'
            : error === 'permission-denied'
              ? '麦克风权限被拒绝，请在浏览器地址栏点击锁形图标并允许麦克风访问。'
              : `语音识别出错：${error}`}
        </div>
      )}

      {/* ── Text fallback ── */}
      <section className={styles.textSection}>
        <label
          htmlFor="cmd-input"
          className={`${styles.label} ${speechUnavailable ? styles.labelHighlighted : ''}`}
        >
          {speechUnavailable ? '请使用文字输入' : '或使用文字输入'}
        </label>
        <input
          id="cmd-input"
          ref={textRef}
          type="text"
          className={`${styles.textInput} ${speechUnavailable ? styles.textInputHighlighted : ''}`}
          placeholder="输入绘图指令，按 Enter 提交…"
          onKeyDown={handleTextKey}
        />
      </section>
    </div>
  )
}
