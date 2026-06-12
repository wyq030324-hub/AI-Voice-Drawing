import { useState, useRef, useEffect, useCallback } from 'react'

export function useSpeechRecognition() {
  const [isSupported] = useState(
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  )
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [finalText, setFinalText] = useState('')
  // null | 'not-supported' | 'permission-denied' | string (other SpeechRecognition error codes)
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)

  useEffect(() => {
    if (!isSupported) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.lang = 'zh-CN'
    r.interimResults = true
    r.continuous = true

    r.onresult = (e) => {
      let interim = ''
      let appended = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) appended += t
        else interim += t
      }
      if (appended) setFinalText((prev) => prev + appended)
      setInterimText(interim)
    }

    r.onerror = (e) => {
      setError(e.error === 'not-allowed' ? 'permission-denied' : e.error)
      setIsListening(false)
    }

    r.onend = () => {
      setIsListening(false)
      setInterimText('')
    }

    recognitionRef.current = r
    return () => r.abort()
  }, [isSupported])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setError(null)
    setFinalText('')
    setInterimText('')
    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch {
      // already started — no-op
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const clearTranscript = useCallback(() => {
    setFinalText('')
    setInterimText('')
  }, [])

  return { isSupported, isListening, interimText, finalText, error, start, stop, clearTranscript }
}
