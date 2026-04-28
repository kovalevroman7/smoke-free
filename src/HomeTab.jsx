import { formatTime, formatTimeAgo } from './utils.js'
import { evaluateGoal } from './goalUtils.js'
import { GOAL_TYPES } from './goalTypes.js'

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
  onOpenCreateGoal,
  onStartEditing,
  onSetActiveTab,
}) {
  const goals = data.goals || []
  const enabledGoals = goals.filter((g) => g.enabled)

  return (
    <>
      <div className="timer-card">
        <div className="timer-label">
          {data.cigarettes.length > 0 ? 'Времени без сигареты' : 'Начните отслеживание'}
        </div>
        <div className="timer-value">
          {data.cigarettes.length > 0 ? formatTime(timeSinceLast) : '—:—:—'}
        </div>
      </div>

      <div className="action-row">
        <button className="smoke-btn" onClick={onAddCigarette}>
          Выкурил сигарету
        </button>
        <button className="add-manual-btn" onClick={onOpenAddModal}>
          + Добавить вручную
        </button>
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
          <div className="goals-card-header">
            <h2>Активные цели</h2>
            <button className="goals-card-add-btn" onClick={onOpenCreateGoal}>
              +
            </button>
          </div>
          <div className="goal-widgets">
            {enabledGoals.map((goal) => {
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
      )}

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
    </>
  )
}
