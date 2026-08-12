import { useMemo, useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import { getHabitFormula } from './habitUtils.js'

export default function HabitFormSheet({ habit, suggestions, onSave, onClose }) {
  const [form, setForm] = useState({
    trigger: habit?.trigger || '',
    replacement: habit?.replacement || '',
    title: habit?.title || '',
  })
  const editing = Boolean(habit)
  const canSave = form.trigger.trim() && form.replacement.trim() && form.title.trim()
  const preview = useMemo(
    () => ({
      trigger: form.trigger.trim() || 'Ситуация',
      replacement: form.replacement.trim() || 'новое действие',
    }),
    [form.trigger, form.replacement]
  )

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  return (
    <BottomSheet
      onClose={onClose}
      ariaLabel={editing ? 'Редактирование привычки' : 'Создание привычки'}
      className="habit-form-sheet"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSave) onSave(form)
        }}
      >
        <div className="habit-sheet-header">
          <h2>{editing ? 'Редактировать привычку' : 'Новая привычка'}</h2>
        </div>

        <div className="habit-form-fields">
          <label className="habit-form-field">
            <span>Ситуация</span>
            <input
              type="text"
              list="habit-trigger-suggestions"
              value={form.trigger}
              onChange={update('trigger')}
              placeholder="Например, после итерации работы"
              maxLength={60}
              autoComplete="off"
              autoFocus
            />
          </label>
          <datalist id="habit-trigger-suggestions">
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>

          <label className="habit-form-field">
            <span>Что сделаю вместо этого?</span>
            <textarea
              value={form.replacement}
              onChange={update('replacement')}
              placeholder="Например, попью воды и похожу 2 минуты"
              maxLength={120}
              rows="2"
            />
          </label>

          <label className="habit-form-field">
            <span>Название привычки</span>
            <input
              type="text"
              value={form.title}
              onChange={update('title')}
              placeholder="Например, перерыв с водой и ходьбой"
              maxLength={80}
            />
          </label>

          <div className="habit-preview" aria-live="polite">
            <span>ВАША НОВАЯ ПРИВЫЧКА</span>
            <strong>{form.title.trim() || 'Название привычки'}</strong>
            <p>{getHabitFormula(preview)}</p>
          </div>
        </div>

        <div className="habit-sheet-footer">
          <button className="habit-primary-action" type="submit" disabled={!canSave}>
            {editing ? 'Сохранить изменения' : 'Создать привычку'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
