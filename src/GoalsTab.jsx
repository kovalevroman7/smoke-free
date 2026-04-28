import SwipeableItem from './SwipeableItem.jsx'
import { evaluateGoal } from './goalUtils.js'
import { GOAL_TYPES } from './goalTypes.js'

/** Вкладка целей: список правил курения с тоглом, свайп-редактированием и онбордингом. */
export default function GoalsTab({
  data, todayCigarettes,
  openGoalSwipeId, setOpenGoalSwipeId,
  onCreateGoal, onEditGoal, onDeleteGoal, onToggleGoal
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
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>Что такое цели?</h3>
          <p style={{ marginBottom: 16, lineHeight: 1.5 }}>
            Цели — это гибкие правила курения, которые помогают постепенно изменить привычки без жёсткого ограничения количества.
          </p>
          <div className="goal-examples">
            <div className="goal-example">
              <span className="goal-example-icon">🌙</span>
              <div><strong>Окно тишины</strong><p>Не курить с 22:00 до 8:00</p></div>
            </div>
            <div className="goal-example">
              <span className="goal-example-icon">⏰</span>
              <div><strong>Лимит до времени</strong><p>Не более 1 сигареты до 11:00</p></div>
            </div>
            <div className="goal-example">
              <span className="goal-example-icon">🌅</span>
              <div><strong>Утренний интервал</strong><p>Между первыми 3 — минимум 30 мин</p></div>
            </div>
            <div className="goal-example">
              <span className="goal-example-icon">🌆</span>
              <div><strong>Вечерний интервал</strong><p>После 20:00 — минимум 30 мин</p></div>
            </div>
          </div>
          <button className="setup-btn" style={{ marginTop: 16 }} onClick={onCreateGoal}>
            Создать первую цель
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="stats-card">
      <h2 style={{ marginBottom: 8 }}>Цели</h2>
      <p className="day-detail-subtitle" style={{ marginBottom: 16 }}>
        Гибкие правила вместо жёсткого лимита
      </p>
      <div className="goals-list">
        {goals.map(goal => {
          const meta = GOAL_TYPES[goal.type]
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
                <div className="goal-row-icon">{meta?.icon}</div>
                <div className="goal-row-body">
                  <div className="goal-row-label">{result.label}</div>
                  <div className="goal-row-hint">{goal.enabled ? result.hint : 'отключена'}</div>
                </div>
                <label className="goal-toggle" onClick={e => e.stopPropagation()}>
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
      <button className="save-settings-btn" style={{ marginTop: 16 }} onClick={onCreateGoal}>
        + Добавить цель
      </button>
    </div>
  )
}
