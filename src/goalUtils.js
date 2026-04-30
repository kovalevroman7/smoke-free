import { getDateKey } from './utils.js'
import { GOAL_TYPES } from './goalTypes.js'

export function generateGoalId() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function parseHHMM(str) {
  if (!str) return 0
  const [h, m] = str.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function getMinutesOfDay(timestamp) {
  const d = new Date(timestamp)
  return d.getHours() * 60 + d.getMinutes()
}

function formatDuration(minutes) {
  if (minutes < 1) return 'меньше минуты'
  if (minutes < 60) return `${minutes} мин`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`
}

export function getCompactGoalLabel(goal) {
  const p = goal.params || {}
  if (goal.type === 'silence') return `Тишина ${p.from}–${p.to}`
  if (goal.type === 'limit_before') return `До ${p.beforeTime}: ≤${p.maxCount}`
  if (goal.type === 'morning_interval')
    return `Первые ${p.count} с интервалом ${p.intervalMinutes} мин`
  if (goal.type === 'evening_interval') return `После ${p.afterTime}: ≥${p.intervalMinutes} мин`
  return GOAL_TYPES[goal.type]?.name || ''
}

export function evaluateGoal(goal, dayCigarettes, now) {
  const sortedCigs = [...dayCigarettes].sort((a, b) => a - b)
  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes()

  if (goal.type === 'silence') {
    const fromMin = parseHHMM(goal.params.from)
    const toMin = parseHHMM(goal.params.to)
    const isInWindow = (m) =>
      fromMin <= toMin ? m >= fromMin && m < toMin : m >= fromMin || m < toMin
    const violated = sortedCigs.some((t) => isInWindow(getMinutesOfDay(t)))
    if (violated)
      return {
        status: 'fail',
        label: `Окно тишины ${goal.params.from}–${goal.params.to}`,
        hint: 'нарушено',
      }
    const inWindowNow = isInWindow(nowMinutes)
    if (inWindowNow) {
      const minutesLeft =
        fromMin <= toMin
          ? toMin - nowMinutes
          : nowMinutes < toMin
            ? toMin - nowMinutes
            : 1440 - nowMinutes + toMin
      return {
        status: 'active',
        label: `В окне тишины ${goal.params.from}–${goal.params.to}`,
        hint: `до конца ${formatDuration(minutesLeft)}`,
      }
    }
    const minutesUntil = nowMinutes < fromMin ? fromMin - nowMinutes : 1440 - nowMinutes + fromMin
    return {
      status: 'pending',
      label: `Тишина с ${goal.params.from} до ${goal.params.to}`,
      hint: `через ${formatDuration(minutesUntil)}`,
    }
  }

  if (goal.type === 'limit_before') {
    const beforeMin = parseHHMM(goal.params.beforeTime)
    const count = sortedCigs.filter((t) => getMinutesOfDay(t) < beforeMin).length
    const max = goal.params.maxCount
    const passed = nowMinutes >= beforeMin
    if (count > max)
      return {
        status: 'fail',
        label: `До ${goal.params.beforeTime}: ${count}/${max}`,
        hint: 'превышен лимит',
      }
    if (passed)
      return {
        status: 'success',
        label: `До ${goal.params.beforeTime}: ${count}/${max}`,
        hint: 'выполнено',
      }
    return {
      status: 'pending',
      label: `До ${goal.params.beforeTime}: ${count}/${max}`,
      hint: `осталось ${formatDuration(beforeMin - nowMinutes)}`,
    }
  }

  if (goal.type === 'morning_interval') {
    const N = goal.params.count
    const intervalMs = goal.params.intervalMinutes * 60 * 1000
    const firstN = sortedCigs.slice(0, N)
    for (let i = 1; i < firstN.length; i++) {
      if (firstN[i] - firstN[i - 1] < intervalMs)
        return {
          status: 'fail',
          label: `Между первыми ${N} ≥ ${goal.params.intervalMinutes} мин`,
          hint: 'интервал нарушен',
        }
    }
    if (firstN.length === N)
      return {
        status: 'success',
        label: `Первые ${N} с интервалом ${goal.params.intervalMinutes} мин`,
        hint: 'выполнено',
      }
    if (firstN.length === 0)
      return {
        status: 'pending',
        label: `Первые ${N} с интервалом ${goal.params.intervalMinutes} мин`,
        hint: `0/${N}`,
      }
    const remaining = Math.max(0, firstN[firstN.length - 1] + intervalMs - now)
    return {
      status: 'pending',
      label: `Первые ${N} с интервалом ${goal.params.intervalMinutes} мин`,
      hint:
        remaining > 0
          ? `${firstN.length}/${N}, следующая через ${formatDuration(Math.ceil(remaining / 60000))}`
          : `${firstN.length}/${N}, можно следующую`,
    }
  }

  if (goal.type === 'evening_interval') {
    const afterMin = parseHHMM(goal.params.afterTime)
    const intervalMs = goal.params.intervalMinutes * 60 * 1000
    const eveningCigs = sortedCigs.filter((t) => getMinutesOfDay(t) >= afterMin)
    for (let i = 1; i < eveningCigs.length; i++) {
      if (eveningCigs[i] - eveningCigs[i - 1] < intervalMs)
        return {
          status: 'fail',
          label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`,
          hint: 'интервал нарушен',
        }
    }
    if (nowMinutes < afterMin)
      return {
        status: 'pending',
        label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`,
        hint: `активна с ${goal.params.afterTime}`,
      }
    if (eveningCigs.length === 0)
      return {
        status: 'active',
        label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`,
        hint: 'пока 0 сигарет',
      }
    const remaining = Math.max(0, eveningCigs[eveningCigs.length - 1] + intervalMs - now)
    return {
      status: 'active',
      label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`,
      hint:
        remaining > 0
          ? `следующая через ${formatDuration(Math.ceil(remaining / 60000))}`
          : 'можно следующую',
    }
  }

  return { status: 'pending', label: '—', hint: '' }
}

export function checkGoalViolationOnAdd(goal, dayCigarettes, addTime) {
  const alreadyFailing = evaluateGoal(goal, dayCigarettes, addTime).status === 'fail'
  if (alreadyFailing) return false
  const newCigs = [...dayCigarettes, addTime].sort((a, b) => a - b)
  return evaluateGoal(goal, newCigs, addTime).status === 'fail'
}

export function getGoalDayStatus(goal, dayCigarettes, dayKey) {
  const today = getDateKey(Date.now())
  const isToday = dayKey === today
  const evalTime = isToday ? Date.now() : new Date(dayKey).setHours(23, 59, 59, 999)
  const result = evaluateGoal(goal, dayCigarettes, evalTime)
  if (result.status === 'fail') return 'fail'
  if (result.status === 'success') return 'success'
  if (!isToday) return 'success'
  return 'pending'
}

export function getGoalSuccessRate(goal, cigarettes, startTimestamp) {
  const startKey = getDateKey(startTimestamp)
  const endKey = getDateKey(Date.now())
  const cursor = new Date(`${startKey}T00:00:00`)
  const end = new Date(`${endKey}T00:00:00`)
  let total = 0,
    success = 0
  while (cursor.getTime() <= end.getTime()) {
    const dayKey = getDateKey(cursor.getTime())
    const dayCigs = cigarettes.filter((c) => getDateKey(c) === dayKey)
    const status = getGoalDayStatus(goal, dayCigs, dayKey)
    if (status === 'success') {
      total++
      success++
    } else if (status === 'fail') {
      total++
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (total === 0) return null
  return Math.round((success / total) * 100)
}
