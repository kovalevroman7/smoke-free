import { GOAL_TYPES } from './goalTypes'

export default function GoalModal({ editingGoalId, goalForm, setGoalForm, onSave, onDelete, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={e => e.stopPropagation()}>
        <h3>{editingGoalId ? 'Редактировать цель' : 'Новая цель'}</h3>

        {!editingGoalId && (
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
        )}

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
          <button className="modal-btn cancel" onClick={onClose}>
            Отмена
          </button>
          <button className="modal-btn save" onClick={onSave}>
            {editingGoalId ? 'Сохранить' : 'Создать'}
          </button>
        </div>

        {editingGoalId && (
          <button
            className="modal-btn delete"
            onClick={() => {
              if (confirm('Удалить эту цель? Действие необратимо.')) {
                onDelete(editingGoalId)
                onClose()
              }
            }}
          >
            Удалить цель
          </button>
        )}
      </div>
    </div>
  )
}
