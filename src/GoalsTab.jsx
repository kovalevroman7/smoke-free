import SwipeableItem from './SwipeableItem.jsx'
import { evaluateGoal } from './goalUtils.js'
import { GOAL_TYPES } from './goalTypes.js'

/** Вкладка целей с автоматически отслеживаемыми правилами. */
export default function GoalsTab({
  data,
  todayCigarettes,
  openGoalSwipeId,
  setOpenGoalSwipeId,
  onCreateGoal,
  onEditGoal,
  onDeleteGoal,
  onToggleGoal,
}) {
  const goals = data.goals || []

  if (goals.length === 0) {
    return (
      <div className="stats-card">
        <h2 style={{ marginBottom: 8 }}>Цели</h2>
        <p className="day-detail-subtitle" style={{ marginBottom: 16 }}>
          Гибкие правила вместо жёсткого лимита
        </p>
        <div className="goals-onboarding">
          <div className="setup-icon">🎯</div>
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>Настройте правила</h3>

          <div className="goal-onboarding-bucket">
            <div className="goal-onboarding-bucket-title">
              <span>📏</span>
              <div>
                <strong>Правила</strong>
                <p>Система следит за выполнением сама</p>
              </div>
            </div>
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
            </div>
          </div>

          <button className="setup-btn" style={{ marginTop: 16 }} onClick={onCreateGoal}>
            Создать первую цель
          </button>
        </div>
      </div>
    )
  }

  const renderSection = () => {
    return (
      <div className="goals-section">
        <div className="goals-section-header">
          <span className="goals-section-icon">📏</span>
          <div>
            <div className="goals-section-title">Правила</div>
            <div className="goals-section-hint">Система следит за выполнением сама</div>
          </div>
        </div>
        {goals.length > 0 && (
          <div className="goals-list">
            {goals.map((goal) => {
              const typeMeta = GOAL_TYPES[goal.type]
              const result = evaluateGoal(goal, todayCigarettes, Date.now())
              return (
                <SwipeableItem
                  key={goal.id}
                  isOpen={openGoalSwipeId === goal.id}
                  onToggle={(isOpen) => setOpenGoalSwipeId(isOpen ? goal.id : null)}
                  onEdit={() => onEditGoal(goal)}
                  onDelete={() => {
                    if (confirm('Удалить эту цель? Действие необратимо.')) onDeleteGoal(goal.id)
                  }}
                >
                  <div className={`goal-row ${goal.enabled ? '' : 'goal-disabled'}`}>
                    <div className="goal-row-icon">{typeMeta?.icon}</div>
                    <div className="goal-row-body">
                      <div className="goal-row-label">{result.label}</div>
                      <div className="goal-row-hint">
                        {goal.enabled ? result.hint : 'отключена'}
                      </div>
                    </div>
                    <label className="goal-toggle" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={goal.enabled}
                        onChange={() => onToggleGoal(goal.id)}
                      />
                      <span className="goal-toggle-slider" />
                    </label>
                  </div>
                </SwipeableItem>
              )
            })}
          </div>
        )}
        <button className="save-settings-btn" style={{ marginTop: 12 }} onClick={onCreateGoal}>
          + Добавить правило
        </button>
      </div>
    )
  }

  return (
    <div className="stats-card">
      <h2 style={{ marginBottom: 8 }}>Цели</h2>
      <p className="day-detail-subtitle" style={{ marginBottom: 16 }}>
        Гибкие правила вместо жёсткого лимита
      </p>
      {renderSection()}
    </div>
  )
}
