import { HABIT_OUTCOME, HABIT_STATUS } from './habitTypes.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function generateHabitId(prefix = 'habit') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createHabit(form, now = Date.now()) {
  return {
    id: generateHabitId(),
    status: HABIT_STATUS.FOCUS,
    trigger: form.trigger.trim(),
    replacement: form.replacement.trim(),
    title: form.title.trim(),
    createdAt: now,
    updatedAt: now,
    statusChangedAt: now,
    archivedAt: null,
    events: [],
  }
}

export function addFocusedHabit(habits, habit, now = Date.now()) {
  return [
    ...(habits || []).map((item) =>
      item.status === HABIT_STATUS.FOCUS
        ? {
            ...item,
            status: HABIT_STATUS.MAINTENANCE,
            statusChangedAt: now,
            updatedAt: now,
            archivedAt: null,
          }
        : item
    ),
    habit,
  ]
}

export function updateHabit(habits, habitId, form, now = Date.now()) {
  return (habits || []).map((habit) =>
    habit.id === habitId
      ? {
          ...habit,
          trigger: form.trigger.trim(),
          replacement: form.replacement.trim(),
          title: form.title.trim(),
          updatedAt: now,
        }
      : habit
  )
}

export function changeHabitStatus(habits, habitId, nextStatus, now = Date.now()) {
  return (habits || []).map((habit) => {
    if (nextStatus === HABIT_STATUS.FOCUS && habit.status === HABIT_STATUS.FOCUS) {
      if (habit.id === habitId) return habit
      return {
        ...habit,
        status: HABIT_STATUS.MAINTENANCE,
        statusChangedAt: now,
        updatedAt: now,
        archivedAt: null,
      }
    }

    if (habit.id !== habitId || habit.status === nextStatus) return habit

    return {
      ...habit,
      status: nextStatus,
      statusChangedAt: now,
      updatedAt: now,
      archivedAt: nextStatus === HABIT_STATUS.ARCHIVED ? now : null,
    }
  })
}

export function addHabitEvent(habits, habitId, outcome, now = Date.now()) {
  return (habits || []).map((habit) =>
    habit.id === habitId && habit.status !== HABIT_STATUS.ARCHIVED
      ? {
          ...habit,
          updatedAt: now,
          events: [
            ...(habit.events || []),
            {
              id: generateHabitId('habit-event'),
              occurredAt: now,
              outcome,
            },
          ],
        }
      : habit
  )
}

export function getHabitStats(habit, now = Date.now()) {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const periodStart = today.getTime() - 6 * DAY_MS
  const events = (habit.events || []).filter(
    (event) => event.occurredAt >= periodStart && event.occurredAt <= now
  )
  const successful = events.filter((event) => event.outcome === HABIT_OUTCOME.REPLACEMENT).length
  const total = events.length
  const percent = total === 0 ? 0 : Math.round((successful / total) * 100)
  const level = percent < 40 ? 'low' : percent < 80 ? 'medium' : 'high'

  return { successful, total, percent, level }
}

export function getHabitFormula(habit) {
  if (!habit.trigger && !habit.replacement) return ''
  return `${habit.trigger} → ${habit.replacement}`
}

export function formatTrigger(trigger) {
  return trigger.trim().toLocaleUpperCase('ru-RU')
}

export function formatHabitCount(count) {
  const lastTwo = count % 100
  const last = count % 10
  if (lastTwo >= 11 && lastTwo <= 14) return `${count} привычек`
  if (last === 1) return `${count} привычка`
  if (last >= 2 && last <= 4) return `${count} привычки`
  return `${count} привычек`
}

export function formatArchiveDate(timestamp) {
  if (!timestamp) return 'В архиве'
  const date = new Date(timestamp)
  return `В архиве с ${date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })}`
}
