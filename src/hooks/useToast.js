import { useState, useCallback, useRef, useEffect } from 'react'

export function useToast(duration = 3500) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }, [])

  const showToast = useCallback(
    (message, action = null) => {
      setToast({ message, action })
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

  return { toast, showToast, hideToast }
}
