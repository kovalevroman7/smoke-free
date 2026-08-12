import { useEffect, useRef, useState } from 'react'

import BottomSheet from './BottomSheet.jsx'
import { HABIT_OUTCOME_CLOSE_DELAY_MS } from './habitOutcomeMotion.js'
import { HABIT_OUTCOME } from './habitTypes.js'
import { formatTrigger } from './habitUtils.js'

export default function HabitOutcomeSheet({ habit, onSelect, onCelebrate, onClose }) {
  const [isCompleting, setIsCompleting] = useState(false)
  const onSelectRef = useRef(onSelect)
  const completionTimeoutRef = useRef(null)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(
    () => () => {
      if (completionTimeoutRef.current !== null) {
        window.clearTimeout(completionTimeoutRef.current)
      }
    },
    []
  )

  const handleReplacement = (event) => {
    if (isCompleting) return

    const rect = event.currentTarget.getBoundingClientRect()
    setIsCompleting(true)
    onCelebrate({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
    completionTimeoutRef.current = window.setTimeout(() => {
      completionTimeoutRef.current = null
      onSelectRef.current(HABIT_OUTCOME.REPLACEMENT)
    }, HABIT_OUTCOME_CLOSE_DELAY_MS)
  }

  return (
    <BottomSheet onClose={onClose} ariaLabel="Результат ситуации" className="habit-outcome-sheet">
      <div className="habit-outcome-content">
        <span className="habit-trigger-chip">{formatTrigger(habit.trigger)}</span>
        <h2>Что произошло дальше?</h2>
        <p className="habit-sheet-description">
          Отметьте результат — так статистика покажет, как меняется привычка.
        </p>

        <button
          className="habit-outcome-choice success"
          type="button"
          disabled={isCompleting}
          onClick={handleReplacement}
        >
          <span>
            <strong>Укрепил новую привычку</strong>
            <small>Новая привычка выполнена</small>
          </span>
          <b>Готово</b>
        </button>

        <button
          className="habit-outcome-choice old-behavior"
          type="button"
          disabled={isCompleting}
          onClick={() => onSelect(HABIT_OUTCOME.OLD_BEHAVIOR)}
        >
          <span>
            <strong>Поступил по-старому</strong>
            <small>Просто фиксируем, без оценки</small>
          </span>
          <b>Отметить</b>
        </button>
      </div>
    </BottomSheet>
  )
}
