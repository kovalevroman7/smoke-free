import { useEffect, useMemo, useRef, useState } from 'react'
import HabitCard from './HabitCard.jsx'
import { HABIT_STATUS, HABIT_STATUS_META } from './habitTypes.js'
import { formatHabitCount } from './habitUtils.js'

const STATUSES = [HABIT_STATUS.FOCUS, HABIT_STATUS.MAINTENANCE, HABIT_STATUS.ARCHIVED]

export default function HabitsTab({ habits, onCreate, onOpenActions, onSituation }) {
  const focusHabit = habits.find((habit) => habit.status === HABIT_STATUS.FOCUS)
  const [status, setStatus] = useState(HABIT_STATUS.FOCUS)
  const [expandedHabitId, setExpandedHabitId] = useState(focusHabit?.id || null)
  const previousFocusIdRef = useRef(focusHabit?.id || null)
  const visibleHabits = useMemo(
    () => habits.filter((habit) => habit.status === status),
    [habits, status]
  )

  useEffect(() => {
    if (expandedHabitId && !habits.some((habit) => habit.id === expandedHabitId)) {
      setExpandedHabitId(null)
    }
  }, [habits, expandedHabitId])

  useEffect(() => {
    if (focusHabit?.id !== previousFocusIdRef.current) {
      previousFocusIdRef.current = focusHabit?.id || null
      if (status === HABIT_STATUS.FOCUS) setExpandedHabitId(focusHabit?.id || null)
    }
  }, [focusHabit?.id, status])

  const selectStatus = (nextStatus) => {
    setStatus(nextStatus)
    setExpandedHabitId(nextStatus === HABIT_STATUS.FOCUS ? focusHabit?.id || null : null)
  }

  return (
    <main className="habits-screen">
      <header className="habits-page-header">
        <h1>Привычки</h1>
        <button type="button" onClick={onCreate}>
          + Добавить
        </button>
      </header>

      <div className="habit-status-switcher" role="tablist" aria-label="Статус привычек">
        {STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={status === item}
            className={status === item ? 'active' : ''}
            onClick={() => selectStatus(item)}
          >
            {HABIT_STATUS_META[item].tabLabel}
          </button>
        ))}
      </div>

      <div className="habit-section-heading">
        <h2>{HABIT_STATUS_META[status].sectionTitle}</h2>
        <span>{formatHabitCount(visibleHabits.length)}</span>
      </div>

      {visibleHabits.length > 0 ? (
        <div className="habit-list">
          {visibleHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              expanded={expandedHabitId === habit.id}
              onToggle={() =>
                setExpandedHabitId((current) => (current === habit.id ? null : habit.id))
              }
              onMenu={() => onOpenActions(habit.id)}
              onSituation={() => onSituation(habit.id)}
            />
          ))}
        </div>
      ) : (
        <div className="habit-empty-state">
          <strong>Здесь пока нет привычек</strong>
          <p>
            {status === HABIT_STATUS.ARCHIVED
              ? 'Архивированные привычки появятся в этом разделе.'
              : 'Создайте привычку и начните отмечать ситуации.'}
          </p>
          {status !== HABIT_STATUS.ARCHIVED && (
            <button type="button" onClick={onCreate}>
              Создать привычку
            </button>
          )}
        </div>
      )}

      {status === HABIT_STATUS.FOCUS && visibleHabits.length > 0 && (
        <aside className="habit-info-card">
          <strong>Следующий этап — поддержание</strong>
          <p>Когда привычка закрепится, переведите её в поддержание и освободите фокус.</p>
        </aside>
      )}

      {status === HABIT_STATUS.MAINTENANCE && visibleHabits.length > 0 && (
        <aside className="habit-info-card">
          <strong>Поддержание без давления</strong>
          <p>Отмечайте ситуации по желанию — статистика за 7 дней покажет динамику.</p>
        </aside>
      )}
    </main>
  )
}
