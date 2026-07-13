import { GOAL_TYPES, GOAL_CATEGORIES } from './goalTypes'

export default function GoalModal({
  editingGoalId,
  goalForm,
  setGoalForm,
  onSave,
  onDelete,
  onClose,
}) {
  const category = goalForm.category || 'rule'
  const isPromise = category === 'promise'
  const categoryTypes = Object.entries(GOAL_TYPES).filter(([, meta]) => meta.category === category)

  const title = editingGoalId
    ? isPromise
      ? 'Редактировать обещание'
      : 'Редактировать правило'
    : isPromise
      ? 'Новое обещание'
      : 'Новое правило'

  const selectCategory = (nextCategory) => {
    if (nextCategory === category) return
    setGoalForm((f) => ({
      ...f,
      category: nextCategory,
      type: nextCategory === 'promise' ? 'custom' : 'silence',
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>

        {!editingGoalId && (
          <div className="settings-input-wrapper">
            <div className="goal-category-toggle">
              {Object.entries(GOAL_CATEGORIES).map(([key, meta]) => (
                <button
                  key={key}
                  className={`goal-category-btn ${category === key ? 'active' : ''}`}
                  onClick={() => selectCategory(key)}
                >
                  <span className="goal-category-icon">{meta.icon}</span>
                  <span className="goal-category-name">{meta.name}</span>
                </button>
              ))}
            </div>
            <p className="type-hint">{GOAL_CATEGORIES[category]?.hint}</p>
          </div>
        )}

        {!editingGoalId && !isPromise && (
          <div className="settings-input-wrapper">
            <label className="input-label">Тип правила</label>
            <div className="goal-type-grid">
              {categoryTypes.map(([key, meta]) => (
                <button
                  key={key}
                  className={`goal-type-btn ${goalForm.type === key ? 'active' : ''}`}
                  onClick={() => setGoalForm((f) => ({ ...f, type: key }))}
                >
                  <span className="goal-type-icon">{meta.icon}</span>
                  <span className="goal-type-name">{meta.name}</span>
                </button>
              ))}
            </div>
            <p className="type-hint">{GOAL_TYPES[goalForm.type]?.description}</p>
          </div>
        )}

        {goalForm.type === 'custom' && (
          <div className="settings-input-wrapper">
            <label className="input-label">Что обещаете себе</label>
            <input
              type="text"
              className="settings-input"
              placeholder="Например: Прогулка вместо перекура"
              value={goalForm.title}
              maxLength={60}
              onChange={(e) => setGoalForm((f) => ({ ...f, title: e.target.value }))}
            />
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
                onChange={(e) => setGoalForm((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
            <div className="settings-input-wrapper">
              <label className="input-label">До</label>
              <input
                type="time"
                className="settings-input"
                value={goalForm.to}
                onChange={(e) => setGoalForm((f) => ({ ...f, to: e.target.value }))}
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
                onChange={(e) => setGoalForm((f) => ({ ...f, maxCount: e.target.value }))}
                min="0"
              />
            </div>
            <div className="settings-input-wrapper">
              <label className="input-label">До времени</label>
              <input
                type="time"
                className="settings-input"
                value={goalForm.beforeTime}
                onChange={(e) => setGoalForm((f) => ({ ...f, beforeTime: e.target.value }))}
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
                onChange={(e) => setGoalForm((f) => ({ ...f, count: e.target.value }))}
                min="2"
              />
            </div>
            <div className="settings-input-wrapper">
              <label className="input-label">Минимальный интервал (мин)</label>
              <input
                type="number"
                className="settings-input"
                value={goalForm.intervalMinutes}
                onChange={(e) => setGoalForm((f) => ({ ...f, intervalMinutes: e.target.value }))}
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
                onChange={(e) => setGoalForm((f) => ({ ...f, afterTime: e.target.value }))}
              />
            </div>
            <div className="settings-input-wrapper">
              <label className="input-label">Минимальный интервал (мин)</label>
              <input
                type="number"
                className="settings-input"
                value={goalForm.intervalMinutes}
                onChange={(e) => setGoalForm((f) => ({ ...f, intervalMinutes: e.target.value }))}
                min="1"
              />
            </div>
          </>
        )}

        <div className="modal-buttons">
          <button className="modal-btn cancel" onClick={onClose}>
            Отмена
          </button>
          <button
            className="modal-btn save"
            onClick={onSave}
            disabled={goalForm.type === 'custom' && !goalForm.title.trim()}
          >
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
