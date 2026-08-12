import { useEffect, useMemo, useRef, useState } from 'react'
import HabitCard from './HabitCard.jsx'
import { HABIT_STATUS } from './habitTypes.js'

export default function HomeHabits({ habits, onOpenAll, onCreate, onSituation }) {
  const visibleHabits = useMemo(
    () => habits.filter((habit) => habit.status !== HABIT_STATUS.ARCHIVED),
    [habits]
  )
  const focusHabit = visibleHabits.find((habit) => habit.status === HABIT_STATUS.FOCUS)
  const orderedHabits = useMemo(
    () => [
      ...(focusHabit ? [focusHabit] : []),
      ...visibleHabits.filter((habit) => habit.status === HABIT_STATUS.MAINTENANCE),
    ],
    [focusHabit, visibleHabits]
  )
  const [expandedHabitId, setExpandedHabitId] = useState(focusHabit?.id || null)
  const previousFocusIdRef = useRef(focusHabit?.id || null)

  useEffect(() => {
    if (focusHabit?.id !== previousFocusIdRef.current) {
      previousFocusIdRef.current = focusHabit?.id || null
      setExpandedHabitId(focusHabit?.id || null)
    }
  }, [focusHabit?.id])

  useEffect(() => {
    if (expandedHabitId && !orderedHabits.some((habit) => habit.id === expandedHabitId)) {
      setExpandedHabitId(focusHabit?.id || null)
    }
  }, [expandedHabitId, focusHabit?.id, orderedHabits])

  return (
    <section className="home-habits" aria-labelledby="home-habits-title">
      <div className="home-habits-header">
        <h2 id="home-habits-title">Мои привычки</h2>
        <button type="button" onClick={onOpenAll}>
          Все привычки
        </button>
      </div>

      {orderedHabits.length > 0 ? (
        <div className="habit-list home-habit-list">
          {orderedHabits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              expanded={expandedHabitId === habit.id}
              showMenu={false}
              onToggle={() =>
                setExpandedHabitId((current) => (current === habit.id ? null : habit.id))
              }
              onSituation={() => onSituation(habit.id)}
            />
          ))}
        </div>
      ) : (
        <div className="home-habits-empty">
          <strong>Сформируйте новую привычку</strong>
          <p>Выберите ситуацию и действие, которое поможет заменить сигарету.</p>
          <button type="button" onClick={onCreate}>
            Создать привычку
          </button>
        </div>
      )}
    </section>
  )
}
