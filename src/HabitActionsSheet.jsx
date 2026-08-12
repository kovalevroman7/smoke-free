import { useState } from 'react'
import BottomSheet from './BottomSheet.jsx'
import { HABIT_STATUS } from './habitTypes.js'

export default function HabitActionsSheet({ habit, onChangeStatus, onEdit, onDelete, onClose }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (confirmingDelete) {
    return (
      <BottomSheet onClose={onClose} ariaLabel="Подтверждение удаления привычки">
        <div className="habit-actions-content">
          <h2>Удалить привычку?</h2>
          <p className="habit-sheet-description">
            Привычка «{habit.title}» и вся её история будут удалены без возможности восстановления.
          </p>
          <button className="habit-action-row danger" type="button" onClick={onDelete}>
            Удалить навсегда
          </button>
          <button
            className="habit-action-cancel"
            type="button"
            onClick={() => setConfirmingDelete(false)}
          >
            Назад
          </button>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet onClose={onClose} ariaLabel={`Действия с привычкой «${habit.title}»`}>
      <div className="habit-actions-content">
        <h2>{habit.title}</h2>
        <p className="habit-sheet-description">Статистика и история привычки сохранятся</p>

        {habit.status === HABIT_STATUS.FOCUS && (
          <button
            className="habit-action-row primary"
            type="button"
            onClick={() => onChangeStatus(HABIT_STATUS.MAINTENANCE)}
          >
            Перевести в поддержание
          </button>
        )}

        {habit.status === HABIT_STATUS.MAINTENANCE && (
          <button
            className="habit-action-row primary"
            type="button"
            onClick={() => onChangeStatus(HABIT_STATUS.FOCUS)}
          >
            Вернуть в фокус
          </button>
        )}

        {habit.status === HABIT_STATUS.ARCHIVED && (
          <>
            <button
              className="habit-action-row primary"
              type="button"
              onClick={() => onChangeStatus(HABIT_STATUS.MAINTENANCE)}
            >
              Вернуть в поддержание
            </button>
            <button
              className="habit-action-row"
              type="button"
              onClick={() => onChangeStatus(HABIT_STATUS.FOCUS)}
            >
              Сделать фокусной
            </button>
          </>
        )}

        {habit.status !== HABIT_STATUS.ARCHIVED && (
          <button className="habit-action-row" type="button" onClick={onEdit}>
            Редактировать привычку
          </button>
        )}

        {habit.status !== HABIT_STATUS.ARCHIVED && (
          <button
            className="habit-action-row danger"
            type="button"
            onClick={() => onChangeStatus(HABIT_STATUS.ARCHIVED)}
          >
            Архивировать
          </button>
        )}

        <button
          className="habit-action-row danger"
          type="button"
          onClick={() => setConfirmingDelete(true)}
        >
          Удалить навсегда
        </button>

        <button className="habit-action-cancel" type="button" onClick={onClose}>
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}
