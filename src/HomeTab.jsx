import { useState, useRef } from 'react'
import { formatTime, formatTimeAgo } from './utils.js'
import { evaluateGoal, getPromiseStreak } from './goalUtils.js'
import { GOAL_CATEGORIES, getGoalCategory } from './goalTypes.js'

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
  onOpenAddModal,
  onStartEditing,
  onSetActiveTab,
  onToggleGoalCompletion,
}) {
  // Блок «Сегодня» временно скрыт (код сохранён).
  const showTodayBlock = false
  const goals = data.goals || []
  const enabledGoals = goals.filter((g) => g.enabled)
  const enabledRules = enabledGoals.filter((g) => getGoalCategory(g) === 'rule')
  const enabledPromises = enabledGoals.filter((g) => getGoalCategory(g) === 'promise')
  const [fabOpen, setFabOpen] = useState(false)
  const [rulesCollapsed, setRulesCollapsed] = useState(false)
  const [promisesCollapsed, setPromisesCollapsed] = useState(false)

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
        </div>
        <div className="count-card">
          <div className="count-label">сегодня</div>
          <div className="count-value">{todaySmoked}</div>
        </div>
      </div>

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
          <div className="fab-backdrop" onClick={() => setFabOpen(false)} />
          <div className="fab-menu">
            <button
              className="fab-menu-item"
              onClick={() => {
                onAddCigarette()
                setFabOpen(false)
              }}
            >
              Выкурил сигарету
            </button>
            <button
              className="fab-menu-item"
              onClick={() => {
                onOpenAddModal()
                setFabOpen(false)
              }}
            >
              Добавить вручную
            </button>
          </div>
        </>
      )}
      <button
        className={`fab ${fabOpen ? 'open' : ''}`}
        aria-label="Добавить"
        onClick={() => setFabOpen((v) => !v)}
      >
        +
      </button>
    </>
  )
}
