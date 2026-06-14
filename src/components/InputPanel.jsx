import { useEffect, useRef, useCallback, useState } from 'react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { parseLongVoiceTranscript } from '../utils/voiceUiCommands'
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

export default function InputPanel({
  onSubmitCommand,
  disabled = false,
  onNotice,
  draftValue = '',
  onDraftChange,
}) {
  const { isSupported, isListening, interimText, finalText, error, start, stop, clearTranscript } =
    useSpeechRecognition()
  const textRef = useRef(null)
  const [voiceMode, setVoiceMode] = useState('instant')
  const isLongMode = voiceMode === 'long'

  // Speech is unavailable when the API is missing OR the user denied mic access
  const speechUnavailable = !isSupported || error === 'permission-denied'
  const setDraft = useCallback((value) => {
    onDraftChange?.(value)
  }, [onDraftChange])

  // Auto-focus + visually highlight text input whenever speech becomes unavailable
  useEffect(() => {
    if (speechUnavailable) textRef.current?.focus()
  }, [speechUnavailable])

  // Stop active voice recognition while parent is busy (LLM / drawing in progress)
  useEffect(() => {
    if (disabled && isListening && !isLongMode) stop()
  }, [disabled, isListening, isLongMode, stop])

  // Long voice mode should keep listening until the user explicitly ends it.
  useEffect(() => {
    if (!isLongMode || disabled || isListening || speechUnavailable) return
    start()
  }, [isLongMode, disabled, isListening, speechUnavailable, start])

  // Auto-submit when a trigger word appears in the accumulated final transcript
  useEffect(() => {
    if (!finalText) return
    if (isLongMode) {
      const result = parseLongVoiceTranscript(finalText)
      if (result.action === 'wait') {
        onNotice?.('正在记录长指令')
        return
      }
      if (result.action === 'stop') {
        clearTranscript()
        setVoiceMode('instant')
        stop()
        onNotice?.('长语音已结束')
        return
      }
      if (!result.command) {
        clearTranscript()
        onNotice?.('长语音草稿为空，请先说出指令内容')
        return
      }
      if (disabled) {
        onNotice?.('当前正在执行，暂不能提交长语音指令')
        return
      }
      onSubmitCommand(result.command)
      clearTranscript()
      onNotice?.('已提交长语音指令，继续监听')
      return
    }

    const cleaned = extractTrigger(finalText)
    if (cleaned === null) return  // no trigger found
    stop()
    clearTranscript()
    if (cleaned) onSubmitCommand(cleaned)  // skip empty-string submit (trigger-word-only utterance)
  }, [finalText, isLongMode, disabled, stop, clearTranscript, onSubmitCommand, onNotice])

  const switchToInstantMode = useCallback(() => {
    setVoiceMode('instant')
    clearTranscript()
    if (isListening) stop()
    onNotice?.('已切换到即时模式')
  }, [clearTranscript, isListening, stop, onNotice])

  const switchToLongMode = useCallback(() => {
    setVoiceMode('long')
    clearTranscript()
    onNotice?.('长语音记录中')
    if (!isListening && !disabled) start()
  }, [clearTranscript, disabled, isListening, start, onNotice])

  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      if (isLongMode) {
        switchToInstantMode()
        return
      }
      stop()
      return
    }
    start()
  }, [isListening, isLongMode, start, stop, switchToInstantMode])

  const handleVoiceSubmit = useCallback(() => {
    const text = finalText.trim()
    if (!text) return
    onSubmitCommand(text)
    clearTranscript()
  }, [finalText, clearTranscript, onSubmitCommand])

  const handleTextKey = useCallback((e) => {
    if (disabled || e.key !== 'Enter' || e.shiftKey) return
    e.preventDefault()
    const text = draftValue.trim()
    if (!text) return
    onSubmitCommand(text)
    setDraft('')
  }, [disabled, draftValue, onSubmitCommand, setDraft])

  const handleTextSubmit = useCallback((e) => {
    e.preventDefault()
    if (disabled) return
    const text = draftValue.trim()
    if (!text) return
    onSubmitCommand(text)
    setDraft('')
  }, [disabled, draftValue, onSubmitCommand, setDraft])

  return (
    <div className={styles.panel}>
      {/* ── Voice section (only rendered when the API exists) ── */}
      {isSupported && (
        <section className={styles.voiceSection}>
          <div className={styles.modeSwitch} role="group" aria-label="语音输入模式">
            <button
              type="button"
              className={`${styles.modeButton}${!isLongMode ? ` ${styles.modeButtonActive}` : ''}`}
              onClick={switchToInstantMode}
              disabled={disabled && !isLongMode}
            >
              即时
            </button>
            <button
              type="button"
              className={`${styles.modeButton}${isLongMode ? ` ${styles.modeButtonActive}` : ''}`}
              onClick={switchToLongMode}
              disabled={disabled}
            >
              长语音
            </button>
          </div>

          <div className={styles.controls}>
            <button
              className={isListening ? styles.btnStop : styles.btnStart}
              onClick={handleVoiceToggle}
              disabled={disabled && !isListening}
            >
              {isListening ? '停止识别' : '开始识别'}
            </button>

            {/* Submit appears after the user stops and there is confirmed final text */}
            {finalText.trim() && !isListening && !isLongMode && (
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

          {isLongMode && (
            <p className={styles.modeHint}>
              正在记录长指令，说“好了 / ok / 执行 / 生成吧”提交，说“彻底结束”停止。
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
      <form className={styles.textSection} onSubmit={handleTextSubmit}>
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
          value={draftValue}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={handleTextKey}
          disabled={disabled}
        />
        <button className={styles.textSubmit} type="submit" disabled={disabled}>
          提交
        </button>
      </form>
    </div>
  )
}
