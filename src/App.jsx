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
  return date.toISOString().split('T')[0]
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
  const [setupCurrentSmokes, setSetupCurrentSmokes] = useState('')
  const [setupTargetSmokes, setSetupTargetSmokes] = useState('')
  const [setupTotalDays, setSetupTotalDays] = useState('')
  const [setupWakeHours, setSetupWakeHours] = useState('16')
  const [setupReductionType, setSetupReductionType] = useState('linear')
  const [countdownTime, setCountdownTime] = useState(0)

  const lastCigarette = data.cigarettes[data.cigarettes.length - 1]

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'observation') {
        if (lastCigarette) {
          setTimeSinceLast(Date.now() - lastCigarette)
        }
      } else if (mode === 'reduction' && data.reductionConfig?.isConfigured) {
        const currentDay = getCurrentProgramDay(data.reductionConfig.startDate)
        const nextAllowed = getNextAllowedTime(data.cigarettes, data.reductionConfig, currentDay)
        const remaining = nextAllowed - Date.now()
        setCountdownTime(Math.max(0, remaining))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastCigarette, mode, data.reductionConfig, data.cigarettes])

  useEffect(() => {
    saveData(data)
  }, [data])

  const addCigarette = useCallback(() => {
    setData(prev => ({
      ...prev,
      cigarettes: [...prev.cigarettes, Date.now()]
    }))
  }, [])

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
    const config = {
      currentSmokes: parseInt(setupCurrentSmokes, 10) || 20,
      targetSmokes: parseInt(setupTargetSmokes, 10) || 0,
      totalDays: parseInt(setupTotalDays, 10) || 30,
      wakeHours: parseInt(setupWakeHours, 10) || 16,
      reductionType: setupReductionType,
      startDate: Date.now(),
      isConfigured: true
    }

    setData(prev => ({
      ...prev,
      reductionConfig: config
    }))

    setShowReductionSetupModal(false)
    setSetupCurrentSmokes('')
    setSetupTargetSmokes('')
    setSetupTotalDays('')
    setSetupWakeHours('16')
    setSetupReductionType('linear')
  }, [setupCurrentSmokes, setupTargetSmokes, setupTotalDays, setupWakeHours, setupReductionType])

  const resetReductionConfig = useCallback(() => {
    setData(prev => ({
      ...prev,
      reductionConfig: null
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
                День {currentProgramDay} из {data.reductionConfig.totalDays}
              </p>
              <button className="modal-btn delete" onClick={resetReductionConfig}>
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
        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">⚙️</span>
          Настройки
        </button>
      </nav>
    </div>
  )
}

export default App
