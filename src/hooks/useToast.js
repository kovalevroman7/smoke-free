import { useState, useCallback, useRef, useEffect } from 'react'

export function useToast(duration = 3500) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = useCallback(
    (message) => {
      setToast(message)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setToast(null), duration)
    },
    [duration]
  )

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return { toast, showToast }
}
