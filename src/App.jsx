import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'smoke-free-data'

const defaultData = {
  cigarettes: [],
  packPrice: 0,
  cigarettesPerPack: 20,
  mode: 'observation',
  reductionConfig: null
}

function loadData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? { ...defaultData, ...JSON.parse(data) } : defaultData
  } catch {
    return defaultData
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function formatTime(ms) {
  if (ms < 0) ms = 0
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const s = seconds % 60
  const m = minutes % 60
  const h = hours

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)

  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  if (hours < 24) return `${hours} ч назад`
  return `${Math.floor(hours / 24)} дн назад`
}

function getDateKey(timestamp) {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDate(dateKey) {
  const date = new Date(dateKey)
  const today = getDateKey(Date.now())
  const yesterday = getDateKey(Date.now() - 86400000)

  if (dateKey === today) return 'Сегодня'
  if (dateKey === yesterday) return 'Вчера'

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function getDayOfWeek(dateKey) {
  const date = new Date(dateKey)
  return date.toLocaleDateString('ru-RU', { weekday: 'short' })
}

function getHourlyCounts(cigarettes, dayKey) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
  cigarettes
    .filter(t => getDateKey(t) === dayKey)
    .forEach(t => {
      const hour = new Date(t).getHours()
      hours[hour].count++
    })
  return hours
}

// Функции для режима сокращения
function getCurrentProgramDay(startDate) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((now - start) / 86400000)
  return Math.max(1, diffDays + 1)
}

function getLinearDailyLimit(config, dayNumber) {
  const { currentSmokes, targetSmokes, totalDays } = config
  const reduction = ((currentSmokes - targetSmokes) / totalDays) * (dayNumber - 1)
  return Math.max(targetSmokes, Math.round(currentSmokes - reduction))
}

function getSteppedDailyLimit(config, dayNumber) {
  const { currentSmokes, targetSmokes, totalDays } = config
  const totalReduction = currentSmokes - targetSmokes
  if (totalReduction <= 0) return currentSmokes
  const daysPerStep = totalDays / totalReduction
  const stepsCompleted = Math.floor((dayNumber - 1) / daysPerStep)
  return Math.max(targetSmokes, currentSmokes - stepsCompleted)
}

function getDailyLimit(config, dayNumber) {
  if (!config) return 0
  if (config.reductionType === 'linear') {
    return getLinearDailyLimit(config, dayNumber)
  }
  return getSteppedDailyLimit(config, dayNumber)
}

function getIntervalMs(config, dailyLimit) {
  if (!config || dailyLimit <= 0) return Infinity
  const intervalMinutes = (config.wakeHours * 60) / dailyLimit
  return intervalMinutes * 60 * 1000
}

function getNextAllowedTime(cigarettes, config, dayNumber) {
  const todayKey = getDateKey(Date.now())
  const todayCigarettes = cigarettes.filter(t => getDateKey(t) === todayKey)

  if (todayCigarettes.length === 0) {
    return Date.now()
  }

  const dailyLimit = getDailyLimit(config, dayNumber)
  const lastCigarette = Math.max(...todayCigarettes)
  const interval = getIntervalMs(config, dailyLimit)
  return lastCigarette + interval
}

function getTodaySmokedCount(cigarettes) {
  const todayKey = getDateKey(Date.now())
  return cigarettes.filter(t => getDateKey(t) === todayKey).length
}

// === Цели ===
const GOAL_TYPES = {
  silence: { name: 'Окно тишины', icon: '🌙', description: 'Не курить в указанный временной промежуток' },
  limit_before: { name: 'Лимит до времени', icon: '⏰', description: 'Не более N сигарет до указанного времени' },
  morning_interval: { name: 'Утренний интервал', icon: '🌅', description: 'Минимальный промежуток между первыми N сигаретами дня' },
  evening_interval: { name: 'Вечерний интервал', icon: '🌆', description: 'Минимальный промежуток между сигаретами после указанного времени' }
}

function generateGoalId() {
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

function evaluateGoal(goal, dayCigarettes, now) {
  const sortedCigs = [...dayCigarettes].sort((a, b) => a - b)
  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes()

  if (goal.type === 'silence') {
    const fromMin = parseHHMM(goal.params.from)
    const toMin = parseHHMM(goal.params.to)
    const isInWindow = (m) => fromMin <= toMin
      ? (m >= fromMin && m < toMin)
      : (m >= fromMin || m < toMin)
    const violated = sortedCigs.some(t => isInWindow(getMinutesOfDay(t)))
    if (violated) return { status: 'fail', label: `Окно тишины ${goal.params.from}–${goal.params.to}`, hint: 'нарушено' }
    const inWindowNow = isInWindow(nowMinutes)
    if (inWindowNow) {
      let minutesLeft
      if (fromMin <= toMin) {
        minutesLeft = toMin - nowMinutes
      } else {
        minutesLeft = nowMinutes < toMin ? toMin - nowMinutes : (1440 - nowMinutes) + toMin
      }
      return { status: 'active', label: `В окне тишины ${goal.params.from}–${goal.params.to}`, hint: `до конца ${formatDuration(minutesLeft)}` }
    }
    let minutesUntil
    if (nowMinutes < fromMin) {
      minutesUntil = fromMin - nowMinutes
    } else {
      minutesUntil = (1440 - nowMinutes) + fromMin
    }
    return { status: 'pending', label: `Тишина с ${goal.params.from} до ${goal.params.to}`, hint: `через ${formatDuration(minutesUntil)}` }
  }

  if (goal.type === 'limit_before') {
    const beforeMin = parseHHMM(goal.params.beforeTime)
    const count = sortedCigs.filter(t => getMinutesOfDay(t) < beforeMin).length
    const max = goal.params.maxCount
    const passed = nowMinutes >= beforeMin
    if (count > max) return { status: 'fail', label: `До ${goal.params.beforeTime}: ${count}/${max}`, hint: 'превышен лимит' }
    if (passed) return { status: 'success', label: `До ${goal.params.beforeTime}: ${count}/${max}`, hint: 'выполнено' }
    return { status: 'pending', label: `До ${goal.params.beforeTime}: ${count}/${max}`, hint: `осталось ${formatDuration(beforeMin - nowMinutes)}` }
  }

  if (goal.type === 'morning_interval') {
    const N = goal.params.count
    const intervalMs = goal.params.intervalMinutes * 60 * 1000
    const firstN = sortedCigs.slice(0, N)
    for (let i = 1; i < firstN.length; i++) {
      if (firstN[i] - firstN[i - 1] < intervalMs) {
        return { status: 'fail', label: `Между первыми ${N} ≥ ${goal.params.intervalMinutes} мин`, hint: 'интервал нарушен' }
      }
    }
    if (firstN.length === N) {
      return { status: 'success', label: `Первые ${N} с интервалом ${goal.params.intervalMinutes} мин`, hint: 'выполнено' }
    }
    if (firstN.length === 0) {
      return { status: 'pending', label: `Первые ${N} с интервалом ${goal.params.intervalMinutes} мин`, hint: `0/${N}` }
    }
    const lastTime = firstN[firstN.length - 1]
    const nextAllowed = lastTime + intervalMs
    const remaining = Math.max(0, nextAllowed - now)
    return {
      status: 'pending',
      label: `Первые ${N} с интервалом ${goal.params.intervalMinutes} мин`,
      hint: remaining > 0
        ? `${firstN.length}/${N}, следующая через ${formatDuration(Math.ceil(remaining / 60000))}`
        : `${firstN.length}/${N}, можно следующую`
    }
  }

  if (goal.type === 'evening_interval') {
    const afterMin = parseHHMM(goal.params.afterTime)
    const intervalMs = goal.params.intervalMinutes * 60 * 1000
    const eveningCigs = sortedCigs.filter(t => getMinutesOfDay(t) >= afterMin)
    for (let i = 1; i < eveningCigs.length; i++) {
      if (eveningCigs[i] - eveningCigs[i - 1] < intervalMs) {
        return { status: 'fail', label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`, hint: 'интервал нарушен' }
      }
    }
    if (nowMinutes < afterMin) {
      return { status: 'pending', label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`, hint: `активна с ${goal.params.afterTime}` }
    }
    if (eveningCigs.length === 0) {
      return { status: 'active', label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`, hint: 'пока 0 сигарет' }
    }
    const lastTime = eveningCigs[eveningCigs.length - 1]
    const nextAllowed = lastTime + intervalMs
    const remaining = Math.max(0, nextAllowed - now)
    return {
      status: 'active',
      label: `После ${goal.params.afterTime}: интервал ≥ ${goal.params.intervalMinutes} мин`,
      hint: remaining > 0
        ? `следующая через ${formatDuration(Math.ceil(remaining / 60000))}`
        : 'можно следующую'
    }
  }

  return { status: 'pending', label: '—', hint: '' }
}

function checkGoalViolationOnAdd(goal, dayCigarettes, addTime) {
  const newCigs = [...dayCigarettes, addTime].sort((a, b) => a - b)
  const result = evaluateGoal(goal, newCigs, addTime)
  return result.status === 'fail'
}

function getGoalDayStatus(goal, dayCigarettes, dayKey) {
  const today = getDateKey(Date.now())
  const isToday = dayKey === today
  const evalTime = isToday ? Date.now() : new Date(dayKey).setHours(23, 59, 59, 999)
  const result = evaluateGoal(goal, dayCigarettes, evalTime)
  if (result.status === 'fail') return 'fail'
  if (!isToday) return 'success'
  return 'pending'
}

function getGoalSuccessRate(goal, cigarettes, startTimestamp) {
  const startKey = getDateKey(startTimestamp)
  const endKey = getDateKey(Date.now())
  const cursor = new Date(`${startKey}T00:00:00`)
  const end = new Date(`${endKey}T00:00:00`)

  let total = 0
  let success = 0
  while (cursor.getTime() <= end.getTime()) {
    const dayKey = getDateKey(cursor.getTime())
    const dayCigs = cigarettes.filter(c => getDateKey(c) === dayKey)
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

function SwipeableItem({ children, onEdit, onDelete, isOpen, onToggle }) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const containerRef = useRef(null)
  const [offset, setOffset] = useState(0)
  const actionsWidth = 100

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    currentX.current = offset
  }

  const handleTouchMove = (e) => {
    const diff = startX.current - e.touches[0].clientX
    let newOffset = currentX.current + diff

    if (newOffset < 0) newOffset = 0
    if (newOffset > actionsWidth) newOffset = actionsWidth

    setOffset(newOffset)
  }

  const handleTouchEnd = () => {
    if (offset > actionsWidth / 2) {
      setOffset(actionsWidth)
      onToggle(true)
    } else {
      setOffset(0)
      onToggle(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      setOffset(0)
    }
  }, [isOpen])

  return (
    <div className="swipeable-container">
      <div className="swipeable-actions">
        <button className="swipe-btn edit" onClick={onEdit}>✏️</button>
        <button className="swipe-btn delete" onClick={onDelete}>🗑️</button>
      </div>
      <div
        ref={containerRef}
        className="swipeable-content"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

function App() {
  const [data, setData] = useState(loadData)
  const [timeSinceLast, setTimeSinceLast] = useState(0)
  const [activeTab, setActiveTab] = useState('home')
  const [selectedDay, setSelectedDay] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editHours, setEditHours] = useState('')
  const [editMinutes, setEditMinutes] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate] = useState('')
  const [addHours, setAddHours] = useState('')
  const [addMinutes, setAddMinutes] = useState('')
  const [settingsPackPrice, setSettingsPackPrice] = useState(data.packPrice?.toString() || '')
  const [settingsCigarettesPerPack, setSettingsCigarettesPerPack] = useState(data.cigarettesPerPack?.toString() || '20')
  const [openSwipeIndex, setOpenSwipeIndex] = useState(null)

  // Состояния для режима сокращения
  const [mode, setMode] = useState(data.mode || 'observation')
  const [showReductionSetupModal, setShowReductionSetupModal] = useState(false)
  const [setupProgramType, setSetupProgramType] = useState('linear')
  const [setupCurrentSmokes, setSetupCurrentSmokes] = useState('')
  const [setupTargetSmokes, setSetupTargetSmokes] = useState('')
  const [setupTotalDays, setSetupTotalDays] = useState('')
  const [setupWakeHours, setSetupWakeHours] = useState('16')
  const [setupReductionType, setSetupReductionType] = useState('linear')
  const [countdownTime, setCountdownTime] = useState(0)

  // Состояния для целей
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [goalForm, setGoalForm] = useState({
    type: 'silence',
    from: '22:00',
    to: '08:00',
    beforeTime: '11:00',
    maxCount: '1',
    count: '3',
    intervalMinutes: '30',
    afterTime: '20:00'
  })
  const [openGoalSwipeId, setOpenGoalSwipeId] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
  }, [])

  const lastCigarette = data.cigarettes[data.cigarettes.length - 1]

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'observation') {
        if (lastCigarette) {
          setTimeSinceLast(Date.now() - lastCigarette)
        }
      } else if (mode === 'reduction' && data.reductionConfig?.isConfigured && data.reductionConfig.type !== 'goals') {
        const currentDay = getCurrentProgramDay(data.reductionConfig.startDate)
        const nextAllowed = getNextAllowedTime(data.cigarettes, data.reductionConfig, currentDay)
        const remaining = nextAllowed - Date.now()
        setCountdownTime(Math.max(0, remaining))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastCigarette, mode, data.reductionConfig, data.cigarettes])

  // Тик для пересчёта статусов целей
  const [, setGoalsTick] = useState(0)
  useEffect(() => {
    if (mode !== 'reduction' || data.reductionConfig?.type !== 'goals') return
    const interval = setInterval(() => setGoalsTick(t => t + 1), 30000)
    return () => clearInterval(interval)
  }, [mode, data.reductionConfig?.type])

  // Если вкладка «Цели» скрылась — переключиться на главную
  useEffect(() => {
    if (activeTab === 'goals' && (mode !== 'reduction' || data.reductionConfig?.type !== 'goals')) {
      setActiveTab('home')
    }
  }, [activeTab, mode, data.reductionConfig?.type])

  useEffect(() => {
    saveData(data)
  }, [data])

  const addCigarette = useCallback(() => {
    const now = Date.now()
    setData(prev => {
      if (prev.mode === 'reduction' && prev.reductionConfig?.type === 'goals' && prev.reductionConfig.goals?.length) {
        const todayKey = getDateKey(now)
        const todayCigs = prev.cigarettes.filter(t => getDateKey(t) === todayKey)
        const violated = prev.reductionConfig.goals
          .filter(g => g.enabled)
          .filter(g => checkGoalViolationOnAdd(g, todayCigs, now))
        if (violated.length > 0) {
          const names = violated.map(g => GOAL_TYPES[g.type]?.name || g.type).join(', ')
          setTimeout(() => showToast(`Нарушает цель: ${names}`), 0)
        }
      }
      return { ...prev, cigarettes: [...prev.cigarettes, now] }
    })
  }, [showToast])

  const startEditing = useCallback((timestamp, index) => {
    const date = new Date(timestamp)
    setEditHours(date.getHours().toString().padStart(2, '0'))
    setEditMinutes(date.getMinutes().toString().padStart(2, '0'))
    setEditingIndex(index)
  }, [])

  const saveEditedTime = useCallback(() => {
    if (editingIndex === null) return

    const hours = parseInt(editHours, 10) || 0
    const minutes = parseInt(editMinutes, 10) || 0
    const originalTimestamp = data.cigarettes[editingIndex]
    const date = new Date(originalTimestamp)
    date.setHours(hours, minutes, 0, 0)

    setData(prev => ({
      ...prev,
      cigarettes: prev.cigarettes.map((t, i) => i === editingIndex ? date.getTime() : t)
    }))
    setEditingIndex(null)
    setEditHours('')
    setEditMinutes('')
  }, [editingIndex, editHours, editMinutes, data.cigarettes])

  const cancelEditing = useCallback(() => {
    setEditingIndex(null)
    setEditHours('')
    setEditMinutes('')
  }, [])

  const deleteCigarette = useCallback(() => {
    if (editingIndex === null) return

    setData(prev => ({
      ...prev,
      cigarettes: prev.cigarettes.filter((_, i) => i !== editingIndex)
    }))
    setEditingIndex(null)
    setEditHours('')
    setEditMinutes('')
  }, [editingIndex])

  const deleteCigaretteByIndex = useCallback((index) => {
    setData(prev => ({
      ...prev,
      cigarettes: prev.cigarettes.filter((_, i) => i !== index)
    }))
    setOpenSwipeIndex(null)
  }, [])

  const openAddModal = useCallback(() => {
    const now = new Date()
    setAddDate(getDateKey(now.getTime()))
    setAddHours(now.getHours().toString().padStart(2, '0'))
    setAddMinutes(now.getMinutes().toString().padStart(2, '0'))
    setShowAddModal(true)
  }, [])

  const closeAddModal = useCallback(() => {
    setShowAddModal(false)
    setAddDate('')
    setAddHours('')
    setAddMinutes('')
  }, [])

  const saveManualCigarette = useCallback(() => {
    const hours = parseInt(addHours, 10) || 0
    const minutes = parseInt(addMinutes, 10) || 0
    const date = new Date(addDate)
    date.setHours(hours, minutes, 0, 0)

    setData(prev => ({
      ...prev,
      cigarettes: [...prev.cigarettes, date.getTime()].sort((a, b) => a - b)
    }))
    closeAddModal()
  }, [addDate, addHours, addMinutes, closeAddModal])

  const saveSettings = useCallback(() => {
    const price = parseFloat(settingsPackPrice) || 0
    const perPack = parseInt(settingsCigarettesPerPack, 10) || 20

    setData(prev => ({
      ...prev,
      packPrice: price,
      cigarettesPerPack: perPack
    }))
  }, [settingsPackPrice, settingsCigarettesPerPack])

  const saveReductionConfig = useCallback(() => {
    const config = setupProgramType === 'linear'
      ? {
          type: 'linear',
          currentSmokes: parseInt(setupCurrentSmokes, 10) || 20,
          targetSmokes: parseInt(setupTargetSmokes, 10) || 0,
          totalDays: parseInt(setupTotalDays, 10) || 30,
          wakeHours: parseInt(setupWakeHours, 10) || 16,
          reductionType: setupReductionType,
          startDate: Date.now(),
          isConfigured: true
        }
      : {
          type: 'goals',
          goals: [],
          goalHistory: {},
          startDate: Date.now(),
          isConfigured: true
        }

    setData(prev => ({
      ...prev,
      reductionConfig: config
    }))

    setShowReductionSetupModal(false)
    setSetupProgramType('linear')
    setSetupCurrentSmokes('')
    setSetupTargetSmokes('')
    setSetupTotalDays('')
    setSetupWakeHours('16')
    setSetupReductionType('linear')
  }, [setupProgramType, setupCurrentSmokes, setupTargetSmokes, setupTotalDays, setupWakeHours, setupReductionType])

  const resetReductionConfig = useCallback(() => {
    setData(prev => ({
      ...prev,
      reductionConfig: null
    }))
  }, [])

  const switchProgramType = useCallback((newType) => {
    setData(prev => {
      const base = newType === 'linear'
        ? {
            type: 'linear',
            currentSmokes: prev.reductionConfig?.currentSmokes || 20,
            targetSmokes: prev.reductionConfig?.targetSmokes ?? 0,
            totalDays: prev.reductionConfig?.totalDays || 30,
            wakeHours: prev.reductionConfig?.wakeHours || 16,
            reductionType: prev.reductionConfig?.reductionType || 'linear',
            startDate: Date.now(),
            isConfigured: true
          }
        : {
            type: 'goals',
            goals: [],
            goalHistory: {},
            startDate: Date.now(),
            isConfigured: true
          }
      return { ...prev, reductionConfig: base }
    })
  }, [])

  const openCreateGoal = useCallback(() => {
    setEditingGoalId(null)
    setGoalForm({
      type: 'silence',
      from: '22:00',
      to: '08:00',
      beforeTime: '11:00',
      maxCount: '1',
      count: '3',
      intervalMinutes: '30',
      afterTime: '20:00'
    })
    setShowGoalModal(true)
  }, [])

  const openEditGoal = useCallback((goal) => {
    setEditingGoalId(goal.id)
    setGoalForm({
      type: goal.type,
      from: goal.params.from || '22:00',
      to: goal.params.to || '08:00',
      beforeTime: goal.params.beforeTime || '11:00',
      maxCount: goal.params.maxCount?.toString() || '1',
      count: goal.params.count?.toString() || '3',
      intervalMinutes: goal.params.intervalMinutes?.toString() || '30',
      afterTime: goal.params.afterTime || '20:00'
    })
    setShowGoalModal(true)
    setOpenGoalSwipeId(null)
  }, [])

  const saveGoal = useCallback(() => {
    let params = {}
    if (goalForm.type === 'silence') {
      params = { from: goalForm.from, to: goalForm.to }
    } else if (goalForm.type === 'limit_before') {
      params = { beforeTime: goalForm.beforeTime, maxCount: parseInt(goalForm.maxCount, 10) || 1 }
    } else if (goalForm.type === 'morning_interval') {
      params = { count: parseInt(goalForm.count, 10) || 3, intervalMinutes: parseInt(goalForm.intervalMinutes, 10) || 30 }
    } else if (goalForm.type === 'evening_interval') {
      params = { afterTime: goalForm.afterTime, intervalMinutes: parseInt(goalForm.intervalMinutes, 10) || 30 }
    }

    setData(prev => {
      const goals = prev.reductionConfig?.goals || []
      let nextGoals
      if (editingGoalId) {
        nextGoals = goals.map(g => g.id === editingGoalId ? { ...g, type: goalForm.type, params } : g)
      } else {
        nextGoals = [...goals, { id: generateGoalId(), type: goalForm.type, enabled: true, params }]
      }
      return { ...prev, reductionConfig: { ...prev.reductionConfig, goals: nextGoals } }
    })

    setShowGoalModal(false)
    setEditingGoalId(null)
  }, [goalForm, editingGoalId])

  const deleteGoal = useCallback((goalId) => {
    setData(prev => ({
      ...prev,
      reductionConfig: {
        ...prev.reductionConfig,
        goals: (prev.reductionConfig?.goals || []).filter(g => g.id !== goalId)
      }
    }))
    setOpenGoalSwipeId(null)
  }, [])

  const toggleGoalEnabled = useCallback((goalId) => {
    setData(prev => ({
      ...prev,
      reductionConfig: {
        ...prev.reductionConfig,
        goals: (prev.reductionConfig?.goals || []).map(g =>
          g.id === goalId ? { ...g, enabled: !g.enabled } : g
        )
      }
    }))
  }, [])

  const todayKey = getDateKey(Date.now())
  const todayCount = data.cigarettes.filter(t => getDateKey(t) === todayKey).length

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return getDateKey(date.getTime())
  })

  const dailyCounts = last7Days.map(day => ({
    day,
    count: data.cigarettes.filter(t => getDateKey(t) === day).length
  }))

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1)
  const weeklyTotal = dailyCounts.reduce((sum, d) => sum + d.count, 0)
  const weeklyCost = data.packPrice && data.cigarettesPerPack
    ? (weeklyTotal / data.cigarettesPerPack) * data.packPrice
    : 0

  const todayCigarettes = data.cigarettes
    .filter(t => getDateKey(t) === todayKey)
    .sort((a, b) => b - a)

  // Значения для режима сокращения
  const currentProgramDay = data.reductionConfig?.isConfigured
    ? getCurrentProgramDay(data.reductionConfig.startDate)
    : 1
  const dailyLimit = data.reductionConfig?.isConfigured
    ? getDailyLimit(data.reductionConfig, currentProgramDay)
    : 0
  const todaySmoked = getTodaySmokedCount(data.cigarettes)
  const canSmoke = countdownTime === 0

  const getTimerClass = () => {
    const hours = timeSinceLast / 3600000
    if (hours < 1) return 'danger'
    if (hours < 2) return 'warning'
    return ''
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Smoke Free</h1>
        <p>Каждая минута без сигареты — победа</p>
      </header>

      {activeTab === 'home' && (
        <>
          {/* Селектор режима */}
          <div className="mode-selector">
            <select
              className="mode-select"
              value={mode}
              onChange={(e) => {
                const newMode = e.target.value
                setMode(newMode)
                setData(prev => ({ ...prev, mode: newMode }))
              }}
            >
              <option value="observation">Наблюдение</option>
              <option value="reduction">Сокращение</option>
            </select>
          </div>

          {/* Режим "Наблюдение" */}
          {mode === 'observation' && (
            <>
              <div className="timer-card">
                <div className="timer-label">
                  {lastCigarette ? 'Времени без сигареты' : 'Начните отслеживание'}
                </div>
                <div className={`timer-value ${getTimerClass()}`}>
                  {lastCigarette ? formatTime(timeSinceLast) : '—:—:—'}
                </div>
              </div>

              <button className="smoke-btn" onClick={addCigarette}>
                Выкурил сигарету
              </button>

              <button className="add-manual-btn" onClick={openAddModal}>
                + Добавить вручную
              </button>

              <div className="stats-card">
                <div className="stats-header">
                  <h2>Сегодня</h2>
                  <span className="today-count">{todayCount} шт</span>
                </div>

                {todayCigarettes.length > 0 ? (
                  <div className="history-list">
                    {todayCigarettes.slice(0, 5).map((time, i) => {
                      const originalIndex = data.cigarettes.indexOf(time)
                      return (
                        <div
                          key={i}
                          className="history-item clickable"
                          onClick={() => startEditing(time, originalIndex)}
                        >
                          <span className="history-time">
                            {new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="history-ago">{formatTimeAgo(time)}</span>
                        </div>
                      )
                    })}
                    {todayCigarettes.length > 5 && (
                      <div className="history-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        и ещё {todayCigarettes.length - 5}...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    Пока нет записей за сегодня
                  </div>
                )}
              </div>
            </>
          )}

          {/* Режим "Сокращение" */}
          {mode === 'reduction' && (
            <>
              {!data.reductionConfig?.isConfigured ? (
                <div className="reduction-setup-card">
                  <div className="setup-icon">📉</div>
                  <h2>Программа сокращения</h2>
                  <p>Настройте план постепенного снижения количества сигарет</p>
                  <button
                    className="setup-btn"
                    onClick={() => setShowReductionSetupModal(true)}
                  >
                    Настроить программу
                  </button>
                </div>
              ) : data.reductionConfig.type === 'goals' ? (
                <>
                  {/* Карточка активных целей */}
                  {(() => {
                    const goals = data.reductionConfig.goals || []
                    const enabled = goals.filter(g => g.enabled)
                    if (enabled.length === 0) {
                      return (
                        <div className="reduction-setup-card">
                          <div className="setup-icon">🎯</div>
                          <h2>Цели не заданы</h2>
                          <p>Перейдите во вкладку «Цели», чтобы создать первую цель</p>
                          <button className="setup-btn" onClick={() => setActiveTab('goals')}>
                            К целям
                          </button>
                        </div>
                      )
                    }
                    return (
                      <div className="goals-card">
                        <div className="goals-card-header">
                          <h2>Активные цели</h2>
                          <span className="goals-card-count">{enabled.length}</span>
                        </div>
                        <div className="goal-widgets">
                          {enabled.map(goal => {
                            const result = evaluateGoal(goal, todayCigarettes, Date.now())
                            const meta = GOAL_TYPES[goal.type]
                            return (
                              <div key={goal.id} className={`goal-widget goal-status-${result.status}`}>
                                <div className="goal-widget-icon">{meta?.icon}</div>
                                <div className="goal-widget-body">
                                  <div className="goal-widget-label">{result.label}</div>
                                  <div className="goal-widget-hint">{result.hint}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  <button className="smoke-btn" onClick={addCigarette}>
                    Выкурил сигарету
                  </button>

                  <button className="add-manual-btn" onClick={openAddModal}>
                    + Добавить вручную
                  </button>

                  <div className="stats-card">
                    <div className="stats-header">
                      <h2>Сегодня</h2>
                      <span className="today-count">{todaySmoked} шт</span>
                    </div>

                    {todayCigarettes.length > 0 ? (
                      <div className="history-list">
                        {todayCigarettes.slice(0, 5).map((time, i) => {
                          const originalIndex = data.cigarettes.indexOf(time)
                          return (
                            <div
                              key={i}
                              className="history-item clickable"
                              onClick={() => startEditing(time, originalIndex)}
                            >
                              <span className="history-time">
                                {new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="history-ago">{formatTimeAgo(time)}</span>
                            </div>
                          )
                        })}
                        {todayCigarettes.length > 5 && (
                          <div className="history-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            и ещё {todayCigarettes.length - 5}...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        Пока нет записей за сегодня
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Индикатор дня программы */}
                  <div className="program-progress">
                    <span className="program-day">
                      День {currentProgramDay} из {data.reductionConfig.totalDays}
                    </span>
                    <div className="program-progress-bar">
                      <div
                        className="program-progress-fill"
                        style={{ width: `${Math.min(100, (currentProgramDay / data.reductionConfig.totalDays) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Таймер обратного отсчёта */}
                  <div className="timer-card">
                    <div className="timer-label">
                      {canSmoke ? 'Можно курить!' : 'До следующей сигареты'}
                    </div>
                    <div className={`timer-value ${canSmoke ? 'can-smoke' : ''}`}>
                      {canSmoke ? '00:00:00' : formatTime(countdownTime)}
                    </div>
                  </div>

                  {/* Прогресс дня */}
                  <div className="daily-progress">
                    <div className="daily-progress-text">
                      Выкурено <strong>{todaySmoked}</strong> из <strong>{dailyLimit}</strong> разрешённых
                    </div>
                    <div className="daily-progress-bar">
                      <div
                        className="daily-progress-fill"
                        style={{
                          width: `${Math.min(100, (todaySmoked / dailyLimit) * 100)}%`,
                          background: todaySmoked > dailyLimit ? 'var(--danger)' : 'var(--primary)'
                        }}
                      />
                    </div>
                    {todaySmoked > dailyLimit && (
                      <div className="limit-exceeded">
                        Превышен лимит на {todaySmoked - dailyLimit}
                      </div>
                    )}
                  </div>

                  <button className="smoke-btn" onClick={addCigarette}>
                    Выкурил сигарету
                  </button>

                  <button className="add-manual-btn" onClick={openAddModal}>
                    + Добавить вручную
                  </button>

                  <div className="stats-card">
                    <div className="stats-header">
                      <h2>Сегодня</h2>
                      <span className="today-count">{todaySmoked} шт</span>
                    </div>

                    {todayCigarettes.length > 0 ? (
                      <div className="history-list">
                        {todayCigarettes.slice(0, 5).map((time, i) => {
                          const originalIndex = data.cigarettes.indexOf(time)
                          return (
                            <div
                              key={i}
                              className="history-item clickable"
                              onClick={() => startEditing(time, originalIndex)}
                            >
                              <span className="history-time">
                                {new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="history-ago">{formatTimeAgo(time)}</span>
                            </div>
                          )
                        })}
                        {todayCigarettes.length > 5 && (
                          <div className="history-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            и ещё {todayCigarettes.length - 5}...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        Пока нет записей за сегодня
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'stats' && (
        <div className="stats-card">
          <h2 style={{ marginBottom: 20 }}>Статистика за неделю</h2>

          <div style={{ marginBottom: 20, padding: '16px', background: 'var(--bg)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Всего за неделю</span>
              <strong>{weeklyTotal} шт</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: data.packPrice > 0 ? 8 : 0 }}>
              <span style={{ color: 'var(--text-secondary)' }}>В среднем в день</span>
              <strong>{(weeklyTotal / 7).toFixed(1)} шт</strong>
            </div>
            {data.packPrice > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Потрачено за неделю</span>
                <strong style={{ color: 'var(--danger)' }}>{weeklyCost.toFixed(0)} ₽</strong>
              </div>
            )}
          </div>

          <div className="chart">
            {dailyCounts.map(({ day, count }) => (
              <div
                key={day}
                className={`chart-bar-wrapper ${selectedDay === day ? 'selected' : ''}`}
                onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                style={{ cursor: 'pointer' }}
              >
                <span className="chart-count">{count}</span>
                <div
                  className="chart-bar"
                  style={{ height: `${(count / maxCount) * 100}px` }}
                />
                <span className="chart-label">{getDayOfWeek(day)}</span>
              </div>
            ))}
          </div>

          {mode === 'reduction' && data.reductionConfig?.type === 'goals' && (data.reductionConfig.goals || []).length > 0 && (() => {
            const goals = data.reductionConfig.goals
            const startKey = getDateKey(data.reductionConfig.startDate)
            return (
              <div className="goals-week-block">
                <div className="goals-week-title">Цели за неделю</div>
                <div className="goals-week-header">
                  <span className="goals-week-icon-spacer" />
                  {last7Days.map(day => (
                    <div key={day} className="goals-week-day-label">{getDayOfWeek(day)}</div>
                  ))}
                </div>
                {goals.map(goal => {
                  const meta = GOAL_TYPES[goal.type]
                  return (
                    <div key={goal.id} className="goals-week-row">
                      <span className="goals-week-icon" title={meta?.name}>{meta?.icon}</span>
                      {last7Days.map(day => {
                        const beforeStart = day < startKey
                        if (beforeStart) {
                          return <div key={day} className="goals-week-cell na">·</div>
                        }
                        const dayCigs = data.cigarettes.filter(t => getDateKey(t) === day)
                        const status = getGoalDayStatus(goal, dayCigs, day)
                        const symbol = status === 'success' ? '✓' : status === 'fail' ? '✗' : '·'
                        return <div key={day} className={`goals-week-cell ${status}`}>{symbol}</div>
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {selectedDay && (
            <div className="day-detail">
              <div className="day-detail-header">
                <h3>{formatDate(selectedDay)}</h3>
                <button className="close-btn" onClick={() => setSelectedDay(null)}>×</button>
              </div>
              <p className="day-detail-subtitle">Распределение по часам</p>
              <div className="hourly-chart">
                {(() => {
                  const hourly = getHourlyCounts(data.cigarettes, selectedDay)
                  const maxHourly = Math.max(...hourly.map(h => h.count), 1)
                  return hourly.map(({ hour, count }) => (
                    <div key={hour} className="hourly-bar-wrapper">
                      {count > 0 && <span className="hourly-count">{count}</span>}
                      <div
                        className="hourly-bar"
                        style={{ height: `${(count / maxHourly) * 60}px` }}
                        title={`${hour}:00 - ${count} шт`}
                      />
                      {hour % 6 === 0 && <span className="hourly-label">{hour}</span>}
                    </div>
                  ))
                })()}
              </div>
              <div className="hourly-legend">
                <span>00:00</span>
                <span>12:00</span>
                <span>23:00</span>
              </div>

              {mode === 'reduction' && data.reductionConfig?.type === 'goals' && (data.reductionConfig.goals || []).length > 0 && (() => {
                const dayCigs = data.cigarettes.filter(t => getDateKey(t) === selectedDay)
                const startKey = getDateKey(data.reductionConfig.startDate)
                if (selectedDay < startKey) return null
                return (
                  <div>
                    <p className="day-detail-subtitle" style={{ marginTop: 20, marginBottom: 8 }}>Цели за день</p>
                    <div className="day-goals-list">
                      {data.reductionConfig.goals.map(goal => {
                        const status = getGoalDayStatus(goal, dayCigs, selectedDay)
                        const meta = GOAL_TYPES[goal.type]
                        const symbol = status === 'success' ? '✓' : status === 'fail' ? '✗' : '…'
                        return (
                          <div key={goal.id} className={`day-goal-item ${status}`}>
                            <span>{meta?.icon}</span>
                            <span style={{ flex: 1 }}>{meta?.name}</span>
                            <span style={{ fontWeight: 600 }}>{symbol}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              <div className="day-cigarettes-list">
                <p className="day-detail-subtitle" style={{ marginTop: 20, marginBottom: 12 }}>Все записи</p>
                {(() => {
                  const dayCigarettes = data.cigarettes
                    .filter(t => getDateKey(t) === selectedDay)
                    .sort((a, b) => b - a)

                  if (dayCigarettes.length === 0) {
                    return <div className="empty-state" style={{ padding: '16px 0' }}>Нет записей</div>
                  }

                  return (
                    <div className="history-list">
                      {dayCigarettes.map((time, i) => {
                        const originalIndex = data.cigarettes.indexOf(time)
                        return (
                          <SwipeableItem
                            key={time}
                            isOpen={openSwipeIndex === originalIndex}
                            onToggle={(isOpen) => setOpenSwipeIndex(isOpen ? originalIndex : null)}
                            onEdit={() => {
                              startEditing(time, originalIndex)
                              setOpenSwipeIndex(null)
                            }}
                            onDelete={() => deleteCigaretteByIndex(originalIndex)}
                          >
                            <div className="history-item">
                              <span className="history-time">
                                {new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="history-ago">#{dayCigarettes.length - i}</span>
                            </div>
                          </SwipeableItem>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'goals' && (
        <div className="stats-card">
          <h2 style={{ marginBottom: 8 }}>Цели</h2>
          <p className="day-detail-subtitle" style={{ marginBottom: 16 }}>
            Гибкие правила вместо жёсткого лимита
          </p>

          {(() => {
            const goals = data.reductionConfig?.goals || []
            if (goals.length === 0) {
              return (
                <div className="goals-onboarding">
                  <div className="setup-icon">🎯</div>
                  <h3 style={{ fontSize: 18, marginBottom: 12 }}>Что такое цели?</h3>
                  <p style={{ marginBottom: 16, lineHeight: 1.5 }}>
                    Цели — это гибкие правила курения, которые помогают постепенно изменить привычки без жёсткого ограничения количества.
                  </p>
                  <div className="goal-examples">
                    <div className="goal-example">
                      <span className="goal-example-icon">🌙</span>
                      <div>
                        <strong>Окно тишины</strong>
                        <p>Не курить с 22:00 до 8:00</p>
                      </div>
                    </div>
                    <div className="goal-example">
                      <span className="goal-example-icon">⏰</span>
                      <div>
                        <strong>Лимит до времени</strong>
                        <p>Не более 1 сигареты до 11:00</p>
                      </div>
                    </div>
                    <div className="goal-example">
                      <span className="goal-example-icon">🌅</span>
                      <div>
                        <strong>Утренний интервал</strong>
                        <p>Между первыми 3 — минимум 30 мин</p>
                      </div>
                    </div>
                    <div className="goal-example">
                      <span className="goal-example-icon">🌆</span>
                      <div>
                        <strong>Вечерний интервал</strong>
                        <p>После 20:00 — минимум 30 мин</p>
                      </div>
                    </div>
                  </div>
                  <button className="setup-btn" style={{ marginTop: 16 }} onClick={openCreateGoal}>
                    Создать первую цель
                  </button>
                </div>
              )
            }
            return (
              <>
                <div className="goals-list">
                  {goals.map(goal => {
                    const meta = GOAL_TYPES[goal.type]
                    const result = evaluateGoal(goal, todayCigarettes, Date.now())
                    return (
                      <SwipeableItem
                        key={goal.id}
                        isOpen={openGoalSwipeId === goal.id}
                        onToggle={(isOpen) => setOpenGoalSwipeId(isOpen ? goal.id : null)}
                        onEdit={() => openEditGoal(goal)}
                        onDelete={() => deleteGoal(goal.id)}
                      >
                        <div className={`goal-row ${goal.enabled ? '' : 'goal-disabled'}`}>
                          <div className="goal-row-icon">{meta?.icon}</div>
                          <div className="goal-row-body">
                            <div className="goal-row-label">{result.label}</div>
                            <div className="goal-row-hint">{goal.enabled ? result.hint : 'отключена'}</div>
                          </div>
                          <label className="goal-toggle" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={goal.enabled}
                              onChange={() => toggleGoalEnabled(goal.id)}
                            />
                            <span className="goal-toggle-slider" />
                          </label>
                        </div>
                      </SwipeableItem>
                    )
                  })}
                </div>
                <button className="save-settings-btn" style={{ marginTop: 16 }} onClick={openCreateGoal}>
                  + Добавить цель
                </button>
              </>
            )
          })()}
        </div>
      )}

      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <h3>{editingGoalId ? 'Редактировать цель' : 'Новая цель'}</h3>

            <div className="settings-input-wrapper">
              <label className="input-label">Тип цели</label>
              <div className="goal-type-grid">
                {Object.entries(GOAL_TYPES).map(([key, meta]) => (
                  <button
                    key={key}
                    className={`goal-type-btn ${goalForm.type === key ? 'active' : ''}`}
                    onClick={() => setGoalForm(f => ({ ...f, type: key }))}
                  >
                    <span className="goal-type-icon">{meta.icon}</span>
                    <span className="goal-type-name">{meta.name}</span>
                  </button>
                ))}
              </div>
              <p className="type-hint">{GOAL_TYPES[goalForm.type]?.description}</p>
            </div>

            {goalForm.type === 'silence' && (
              <>
                <div className="settings-input-wrapper">
                  <label className="input-label">Не курить с</label>
                  <input
                    type="time"
                    className="settings-input"
                    value={goalForm.from}
                    onChange={e => setGoalForm(f => ({ ...f, from: e.target.value }))}
                  />
                </div>
                <div className="settings-input-wrapper">
                  <label className="input-label">До</label>
                  <input
                    type="time"
                    className="settings-input"
                    value={goalForm.to}
                    onChange={e => setGoalForm(f => ({ ...f, to: e.target.value }))}
                  />
                </div>
              </>
            )}

            {goalForm.type === 'limit_before' && (
              <>
                <div className="settings-input-wrapper">
                  <label className="input-label">Максимум сигарет</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={goalForm.maxCount}
                    onChange={e => setGoalForm(f => ({ ...f, maxCount: e.target.value }))}
                    min="0"
                  />
                </div>
                <div className="settings-input-wrapper">
                  <label className="input-label">До времени</label>
                  <input
                    type="time"
                    className="settings-input"
                    value={goalForm.beforeTime}
                    onChange={e => setGoalForm(f => ({ ...f, beforeTime: e.target.value }))}
                  />
                </div>
              </>
            )}

            {goalForm.type === 'morning_interval' && (
              <>
                <div className="settings-input-wrapper">
                  <label className="input-label">Количество первых сигарет</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={goalForm.count}
                    onChange={e => setGoalForm(f => ({ ...f, count: e.target.value }))}
                    min="2"
                  />
                </div>
                <div className="settings-input-wrapper">
                  <label className="input-label">Минимальный интервал (мин)</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={goalForm.intervalMinutes}
                    onChange={e => setGoalForm(f => ({ ...f, intervalMinutes: e.target.value }))}
                    min="1"
                  />
                </div>
              </>
            )}

            {goalForm.type === 'evening_interval' && (
              <>
                <div className="settings-input-wrapper">
                  <label className="input-label">Активна после</label>
                  <input
                    type="time"
                    className="settings-input"
                    value={goalForm.afterTime}
                    onChange={e => setGoalForm(f => ({ ...f, afterTime: e.target.value }))}
                  />
                </div>
                <div className="settings-input-wrapper">
                  <label className="input-label">Минимальный интервал (мин)</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={goalForm.intervalMinutes}
                    onChange={e => setGoalForm(f => ({ ...f, intervalMinutes: e.target.value }))}
                    min="1"
                  />
                </div>
              </>
            )}

            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={() => setShowGoalModal(false)}>
                Отмена
              </button>
              <button className="modal-btn save" onClick={saveGoal}>
                {editingGoalId ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Добавить запись</h3>
            <div className="date-input-wrapper">
              <label className="input-label">Дата</label>
              <input
                type="date"
                className="date-input"
                value={addDate}
                onChange={e => setAddDate(e.target.value)}
                max={getDateKey(Date.now())}
              />
            </div>
            <div className="time-input-wrapper">
              <label className="input-label">Время</label>
              <div className="time-inputs">
                <input
                  type="number"
                  className="time-input-field"
                  value={addHours}
                  onChange={e => {
                    const val = e.target.value.slice(0, 2)
                    if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 23)) {
                      setAddHours(val)
                    }
                  }}
                  min="0"
                  max="23"
                  placeholder="00"
                />
                <span className="time-separator">:</span>
                <input
                  type="number"
                  className="time-input-field"
                  value={addMinutes}
                  onChange={e => {
                    const val = e.target.value.slice(0, 2)
                    if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 59)) {
                      setAddMinutes(val)
                    }
                  }}
                  min="0"
                  max="59"
                  placeholder="00"
                />
              </div>
            </div>
            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={closeAddModal}>
                Отмена
              </button>
              <button className="modal-btn save" onClick={saveManualCigarette}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {editingIndex !== null && (
        <div className="modal-overlay" onClick={cancelEditing}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Редактировать время</h3>
            <div className="time-inputs">
              <input
                type="number"
                className="time-input-field"
                value={editHours}
                onChange={e => {
                  const val = e.target.value.slice(0, 2)
                  if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 23)) {
                    setEditHours(val)
                  }
                }}
                min="0"
                max="23"
                placeholder="00"
                autoFocus
              />
              <span className="time-separator">:</span>
              <input
                type="number"
                className="time-input-field"
                value={editMinutes}
                onChange={e => {
                  const val = e.target.value.slice(0, 2)
                  if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 59)) {
                    setEditMinutes(val)
                  }
                }}
                min="0"
                max="59"
                placeholder="00"
              />
            </div>
            <div className="modal-buttons">
              <button className="modal-btn cancel" onClick={cancelEditing}>
                Отмена
              </button>
              <button className="modal-btn save" onClick={saveEditedTime}>
                Сохранить
              </button>
            </div>
            <button className="modal-btn delete" onClick={deleteCigarette}>
              Удалить запись
            </button>
          </div>
        </div>
      )}

      {/* Модалка настройки программы сокращения */}
      {showReductionSetupModal && (
        <div className="modal-overlay" onClick={() => setShowReductionSetupModal(false)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()}>
            <h3>Настройка программы</h3>

            <div className="settings-input-wrapper">
              <label className="input-label">Тип программы</label>
              <div className="reduction-type-selector">
                <button
                  className={`type-btn ${setupProgramType === 'linear' ? 'active' : ''}`}
                  onClick={() => setSetupProgramType('linear')}
                >
                  Линейный
                </button>
                <button
                  className={`type-btn ${setupProgramType === 'goals' ? 'active' : ''}`}
                  onClick={() => setSetupProgramType('goals')}
                >
                  По целям
                </button>
              </div>
              <p className="type-hint">
                {setupProgramType === 'linear'
                  ? 'Единый дневной лимит и таймер между сигаретами'
                  : 'Гибкие цели: окно тишины, лимиты, интервалы'}
              </p>
            </div>

            {setupProgramType === 'linear' ? (
              <>
                <div className="settings-input-wrapper">
                  <label className="input-label">Сигарет в день сейчас</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={setupCurrentSmokes}
                    onChange={e => setSetupCurrentSmokes(e.target.value)}
                    placeholder="20"
                    min="1"
                  />
                </div>

                <div className="settings-input-wrapper">
                  <label className="input-label">Цель (сигарет в день)</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={setupTargetSmokes}
                    onChange={e => setSetupTargetSmokes(e.target.value)}
                    placeholder="5"
                    min="0"
                  />
                </div>

                <div className="settings-input-wrapper">
                  <label className="input-label">Период сокращения (дней)</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={setupTotalDays}
                    onChange={e => setSetupTotalDays(e.target.value)}
                    placeholder="30"
                    min="1"
                  />
                </div>

                <div className="settings-input-wrapper">
                  <label className="input-label">Часы бодрствования</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={setupWakeHours}
                    onChange={e => setSetupWakeHours(e.target.value)}
                    placeholder="16"
                    min="1"
                    max="24"
                  />
                </div>

                <div className="settings-input-wrapper">
                  <label className="input-label">Тип сокращения</label>
                  <div className="reduction-type-selector">
                    <button
                      className={`type-btn ${setupReductionType === 'linear' ? 'active' : ''}`}
                      onClick={() => setSetupReductionType('linear')}
                    >
                      Линейное
                    </button>
                    <button
                      className={`type-btn ${setupReductionType === 'stepped' ? 'active' : ''}`}
                      onClick={() => setSetupReductionType('stepped')}
                    >
                      Ступенчатое
                    </button>
                  </div>
                  <p className="type-hint">
                    {setupReductionType === 'linear'
                      ? 'Плавное уменьшение каждый день'
                      : 'Уменьшение на 1 сигарету каждые N дней'}
                  </p>
                </div>
              </>
            ) : (
              <p className="type-hint" style={{ marginBottom: 16 }}>
                После запуска программы перейдите во вкладку «Цели», чтобы добавить первую цель.
              </p>
            )}

            <div className="modal-buttons">
              <button
                className="modal-btn cancel"
                onClick={() => setShowReductionSetupModal(false)}
              >
                Отмена
              </button>
              <button className="modal-btn save" onClick={saveReductionConfig}>
                Начать
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="stats-card">
          <h2 style={{ marginBottom: 20 }}>Настройки</h2>

          <div className="settings-section">
            <h3 className="settings-section-title">Стоимость сигарет</h3>
            <div className="settings-input-wrapper">
              <label className="input-label">Цена пачки (₽)</label>
              <input
                type="number"
                className="settings-input"
                value={settingsPackPrice}
                onChange={e => setSettingsPackPrice(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="settings-input-wrapper">
              <label className="input-label">Сигарет в пачке</label>
              <input
                type="number"
                className="settings-input"
                value={settingsCigarettesPerPack}
                onChange={e => setSettingsCigarettesPerPack(e.target.value)}
                placeholder="20"
                min="1"
              />
            </div>
            <button className="save-settings-btn" onClick={saveSettings}>
              Сохранить
            </button>
          </div>

          {data.reductionConfig?.isConfigured && (
            <div className="settings-section" style={{ marginTop: 20 }}>
              <h3 className="settings-section-title">Программа сокращения</h3>
              <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
                {data.reductionConfig.type === 'goals'
                  ? `Тип: По целям, день ${getCurrentProgramDay(data.reductionConfig.startDate)}`
                  : `Тип: Линейный, день ${currentProgramDay} из ${data.reductionConfig.totalDays}`}
              </p>

              <label className="input-label">Сменить тип программы</label>
              <div className="reduction-type-selector">
                <button
                  className={`type-btn ${data.reductionConfig.type !== 'goals' ? 'active' : ''}`}
                  onClick={() => {
                    if (data.reductionConfig.type !== 'goals') return
                    if (confirm('Сменить на линейный? Прогресс программы (день N) будет сброшен.')) {
                      switchProgramType('linear')
                    }
                  }}
                >
                  Линейный
                </button>
                <button
                  className={`type-btn ${data.reductionConfig.type === 'goals' ? 'active' : ''}`}
                  onClick={() => {
                    if (data.reductionConfig.type === 'goals') return
                    if (confirm('Сменить на цели? Прогресс программы (день N) будет сброшен.')) {
                      switchProgramType('goals')
                    }
                  }}
                >
                  По целям
                </button>
              </div>

              <button className="modal-btn delete" style={{ marginTop: 16 }} onClick={resetReductionConfig}>
                Сбросить программу
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          Главная
        </button>
        <button
          className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="nav-icon">📊</span>
          Статистика
        </button>
        {mode === 'reduction' && data.reductionConfig?.type === 'goals' && (
          <button
            className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => setActiveTab('goals')}
          >
            <span className="nav-icon">🎯</span>
            Цели
          </button>
        )}
        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">⚙️</span>
          Настройки
        </button>
      </nav>

      {toast && (
        <div className="toast">{toast}</div>
      )}
    </div>
  )
}

export default App
