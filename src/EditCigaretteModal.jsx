/** Модалка редактирования времени существующей записи о курении. */
export default function EditCigaretteModal({
  editHours, setEditHours,
  editMinutes, setEditMinutes,
  onSave, onDelete, onClose
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Редактировать время</h3>
        <div className="time-inputs">
          <input
            type="number"
            className="time-input-field"
            value={editHours}
            onChange={e => {
              const val = e.target.value.slice(0, 2)
              if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 23)) setEditHours(val)
            }}
            min="0" max="23" placeholder="00" autoFocus
          />
          <span className="time-separator">:</span>
          <input
            type="number"
            className="time-input-field"
            value={editMinutes}
            onChange={e => {
              const val = e.target.value.slice(0, 2)
              if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 59)) setEditMinutes(val)
            }}
            min="0" max="59" placeholder="00"
          />
        </div>
        <div className="modal-buttons">
          <button className="modal-btn cancel" onClick={onClose}>Отмена</button>
          <button className="modal-btn save" onClick={onSave}>Сохранить</button>
        </div>
        <button className="modal-btn delete" onClick={onDelete}>Удалить запись</button>
      </div>
    </div>
  )
}
