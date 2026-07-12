import { useState, useRef } from 'react'
import { formatTime, formatTimeAgo } from './utils.js'
import { evaluateGoal } from './goalUtils.js'

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

/** Карточка активной цели. Для кастомных целей поддерживает отметку выполнения долгим нажатием. */
function GoalWidget({ goal, result, onLongPress }) {
  const timerRef = useRef(null)
  const isCustom = goal.type === 'custom'

  const start = () => {
    if (!isCustom) return
    timerRef.current = setTimeout(() => onLongPress(goal.id), 500)
  }
  const cancel = () => {
    clearTimeout(timerRef.current)
  }

  return (
    <div
      className={`goal-widget goal-status-${result.status}${isCustom ? ' goal-widget-pressable' : ''}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={isCustom ? (e) => e.preventDefault() : undefined}
    >
      <div className="goal-widget-icon">
        <GoalStatusIcon status={result.status} />
      </div>
      <div className="goal-widget-body">
        <div className="goal-widget-label">{result.label}</div>
        <div className="goal-widget-hint">{result.hint}</div>
      </div>
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
  const [fabOpen, setFabOpen] = useState(false)
  const [goalsCollapsed, setGoalsCollapsed] = useState(false)

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
        <div className="goals-card">
          <button
            className="goals-card-header goals-card-toggle"
            onClick={() => setGoalsCollapsed((v) => !v)}
            aria-expanded={!goalsCollapsed}
          >
            <h2>Активные цели</h2>
            <span className={`goals-card-chevron ${goalsCollapsed ? 'collapsed' : ''}`}>
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
          {!goalsCollapsed && (
            <div className="goal-widgets">
              {enabledGoals.map((goal) => {
                const result = evaluateGoal(goal, todayCigarettes, Date.now())
                return (
                  <GoalWidget
                    key={goal.id}
                    goal={goal}
                    result={result}
                    onLongPress={onToggleGoalCompletion}
                  />
                )
              })}
            </div>
          )}
        </div>
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
