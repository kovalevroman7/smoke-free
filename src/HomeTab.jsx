import { useEffect, useState, useRef } from 'react'
import { formatCigaretteAmount, formatTime, formatTimeAgo } from './utils.js'
import { evaluateGoal, getPromiseStreak } from './goalUtils.js'
import { GOAL_CATEGORIES, getGoalCategory } from './goalTypes.js'
import HomeHabits from './HomeHabits.jsx'

/** Иконка статуса цели: галочка (успех), часы (в процессе), крестик (нарушено). */
function GoalStatusIcon({ status }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.4,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  if (status === 'fail') {
    return (
      <svg {...common}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    )
  }
  if (status === 'pending') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  // success / active
  return (
    <svg {...common}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/** Карточка активной цели. Для обещаний поддерживает отметку выполнения долгим нажатием. */
function GoalWidget({ goal, result, streak, onLongPress }) {
  const timerRef = useRef(null)
  const isPromise = getGoalCategory(goal) === 'promise'

  const start = () => {
    if (!isPromise) return
    timerRef.current = setTimeout(() => onLongPress(goal.id), 500)
  }
  const cancel = () => {
    clearTimeout(timerRef.current)
  }

  return (
    <div
      className={`goal-widget goal-status-${result.status}${isPromise ? ' goal-widget-pressable' : ''}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={isPromise ? (e) => e.preventDefault() : undefined}
    >
      <div className="goal-widget-icon">
        <GoalStatusIcon status={result.status} />
      </div>
      <div className="goal-widget-body">
        <div className="goal-widget-label">{result.label}</div>
        <div className="goal-widget-hint">{result.hint}</div>
      </div>
      {isPromise && streak > 0 && <div className="goal-widget-streak">🔥 {streak}</div>}
    </div>
  )
}

/** Главная вкладка: таймер без сигареты, кнопки действий, активные цели, лог за сегодня. */
export default function HomeTab({
  data,
  timeSinceLast,
  todayCigarettes,
  todaySmoked,
  showAllLog,
  setShowAllLog,
  onAddCigarette,
  onStartEditing,
  onSetActiveTab,
  onToggleGoalCompletion,
  onOpenHabits,
  onCreateHabit,
  onHabitSituation,
}) {
  // Блок «Сегодня» временно скрыт (код сохранён).
  const showTodayBlock = false
  const goals = data.goals || []
  const enabledGoals = goals.filter((g) => g.enabled)
  const enabledRules = enabledGoals.filter((g) => getGoalCategory(g) === 'rule')
  const enabledPromises = enabledGoals.filter((g) => getGoalCategory(g) === 'promise')
  const lastCigarette = data.cigarettes[data.cigarettes.length - 1]
  const lastTag = lastCigarette ? (data.cigaretteTags || {})[lastCigarette] : undefined
  const [fabOpen, setFabOpen] = useState(false)
  const fabButtonRef = useRef(null)
  const firstFractionOptionRef = useRef(null)
  const fabOpenedByKeyboardRef = useRef(false)
  const fabLongPressTimerRef = useRef(null)
  const fabLongPressTriggeredRef = useRef(false)
  const fabPressCancelledRef = useRef(false)
  const [rulesCollapsed, setRulesCollapsed] = useState(false)
  const [promisesCollapsed, setPromisesCollapsed] = useState(false)

  useEffect(() => {
    if (!fabOpen) return undefined
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setFabOpen(false)
      requestAnimationFrame(() => fabButtonRef.current?.focus())
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [fabOpen])

  useEffect(() => {
    if (!fabOpen || !fabOpenedByKeyboardRef.current) return
    fabOpenedByKeyboardRef.current = false
    firstFractionOptionRef.current?.focus()
  }, [fabOpen])

  useEffect(
    () => () => {
      if (fabLongPressTimerRef.current) clearTimeout(fabLongPressTimerRef.current)
    },
    []
  )

  const startFabLongPress = (event) => {
    if (event.button !== 0) return
    fabPressCancelledRef.current = false
    fabLongPressTriggeredRef.current = false
    if (fabOpen) return
    fabOpenedByKeyboardRef.current = false
    if (fabLongPressTimerRef.current) clearTimeout(fabLongPressTimerRef.current)
    fabLongPressTimerRef.current = setTimeout(() => {
      fabLongPressTriggeredRef.current = true
      setFabOpen(true)
      if (typeof navigator.vibrate === 'function') navigator.vibrate(30)
    }, 500)
  }

  const finishFabPress = () => {
    if (fabLongPressTimerRef.current) clearTimeout(fabLongPressTimerRef.current)
    if (fabLongPressTriggeredRef.current) {
      fabLongPressTriggeredRef.current = false
      return
    }
    if (fabOpen) {
      setFabOpen(false)
      return
    }
    if (!fabPressCancelledRef.current) {
      onAddCigarette(1)
    }
  }

  const cancelFabPress = () => {
    if (fabLongPressTimerRef.current) clearTimeout(fabLongPressTimerRef.current)
    fabPressCancelledRef.current = true
  }

  const addFraction = (amount) => {
    onAddCigarette(amount)
    setFabOpen(false)
  }

  const renderGoalsAccordion = (category, categoryGoals, collapsed, setCollapsed) => {
    if (categoryGoals.length === 0) return null
    const meta = GOAL_CATEGORIES[category]
    return (
      <div className="goals-card">
        <button
          className="goals-card-header goals-card-toggle"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
        >
          <h2>{meta.name}</h2>
          <span className={`goals-card-chevron ${collapsed ? 'collapsed' : ''}`}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
        {!collapsed && (
          <div className="goal-widgets">
            {categoryGoals.map((goal) => {
              const result = evaluateGoal(goal, todayCigarettes, Date.now())
              const streak = category === 'promise' ? getPromiseStreak(goal).current : 0
              return (
                <GoalWidget
                  key={goal.id}
                  goal={goal}
                  result={result}
                  streak={streak}
                  onLongPress={onToggleGoalCompletion}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="timer-row">
        <div className="timer-card">
          <div className="timer-label">
            {data.cigarettes.length > 0 ? 'Времени без сигареты' : 'Начните отслеживание'}
          </div>
          <div className="timer-value">
            {data.cigarettes.length > 0 ? formatTime(timeSinceLast) : '—:—:—'}
          </div>
          {lastCigarette && (
            <div className="timer-last">
              <span className="timer-last-label">посл:</span>
              <span className="timer-last-time">
                {new Date(lastCigarette).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {lastTag && <span className="timer-last-tag">{lastTag}</span>}
            </div>
          )}
        </div>
        <div className="count-card">
          <div className="count-label">сегодня</div>
          <div className="count-value">{formatCigaretteAmount(todaySmoked)}</div>
        </div>
      </div>

      <HomeHabits
        habits={data.habits || []}
        onOpenAll={onOpenHabits}
        onCreate={onCreateHabit}
        onSituation={onHabitSituation}
      />

      {enabledGoals.length === 0 ? (
        <div className="reduction-setup-card">
          <div className="setup-icon">🎯</div>
          <h2>Цели не заданы</h2>
          <p>Перейдите во вкладку «Цели», чтобы создать первую цель</p>
          <button className="setup-btn" onClick={() => onSetActiveTab('goals')}>
            К целям
          </button>
        </div>
      ) : (
        <>
          {renderGoalsAccordion('rule', enabledRules, rulesCollapsed, setRulesCollapsed)}
          {renderGoalsAccordion(
            'promise',
            enabledPromises,
            promisesCollapsed,
            setPromisesCollapsed
          )}
        </>
      )}

      {showTodayBlock && (
        <div className="stats-card">
          <div className="stats-header">
            <h2>Сегодня</h2>
            <span className="today-count">{todaySmoked} шт</span>
          </div>
          <div className="history-list">
            {todayCigarettes.length > 0 ? (
              (showAllLog ? todayCigarettes : todayCigarettes.slice(0, 5)).map((time, i) => {
                const originalIndex = data.cigarettes.indexOf(time)
                return (
                  <div
                    key={i}
                    className="history-item clickable"
                    onClick={() => onStartEditing(time, originalIndex)}
                  >
                    <span className="history-time">
                      {new Date(time).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span className="history-ago">{formatTimeAgo(time)}</span>
                  </div>
                )
              })
            ) : (
              <div className="empty-state">Пока нет записей за сегодня</div>
            )}
            {todayCigarettes.length > 5 && (
              <button className="show-all-log-btn" onClick={() => setShowAllLog((v) => !v)}>
                {showAllLog ? 'Свернуть' : 'Показать всё'}
              </button>
            )}
          </div>
        </div>
      )}

      {fabOpen && (
        <>
          <div className="fab-backdrop" aria-hidden="true" onClick={() => setFabOpen(false)} />
          <div
            className="fab-fraction-menu"
            id="fab-fraction-menu"
            role="menu"
            aria-label="Выберите количество сигареты"
            onKeyDown={(event) => {
              if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]')]
              const currentIndex = items.indexOf(document.activeElement)
              if (event.key === 'Home') items[0]?.focus()
              else if (event.key === 'End') items.at(-1)?.focus()
              else {
                const offset = event.key === 'ArrowDown' ? 1 : -1
                items[(currentIndex + offset + items.length) % items.length]?.focus()
              }
            }}
          >
            {[
              { amount: 0.75, symbol: '¾', label: '¾ сигареты' },
              { amount: 0.5, symbol: '½', label: '½ сигареты' },
              { amount: 0.25, symbol: '¼', label: '¼ сигареты' },
            ].map(({ amount, symbol, label }) => (
              <button
                className="fab-fraction-item"
                type="button"
                key={amount}
                ref={amount === 0.75 ? firstFractionOptionRef : undefined}
                role="menuitem"
                onClick={() => addFraction(amount)}
                aria-label={`Добавить ${label}`}
              >
                <span className="fab-fraction-circle" aria-hidden="true">
                  {symbol}
                </span>
                <span className="fab-fraction-label">{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <button
        ref={fabButtonRef}
        className={`fab ${fabOpen ? 'open' : ''}`}
        aria-label={fabOpen ? 'Закрыть меню' : 'Добавить'}
        aria-haspopup="menu"
        aria-controls="fab-fraction-menu"
        aria-expanded={fabOpen}
        onPointerDown={startFabLongPress}
        onPointerUp={finishFabPress}
        onPointerLeave={cancelFabPress}
        onPointerCancel={cancelFabPress}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (fabOpen || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
          event.preventDefault()
          fabOpenedByKeyboardRef.current = true
          setFabOpen(true)
        }}
        onClick={(event) => {
          if (event.detail === 0) {
            if (fabOpen) setFabOpen(false)
            else onAddCigarette(1)
          }
        }}
      >
        {fabOpen ? '×' : '+'}
      </button>
    </>
  )
}
