import { getDateKey } from './utils.js'

/** Модалка ручного добавления записи о курении с выбором даты и времени. */
export default function AddCigaretteModal({
  addDate,
  setAddDate,
  addHours,
  setAddHours,
  addMinutes,
  setAddMinutes,
  onSave,
  onClose,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Добавить запись</h3>
        <div className="date-input-wrapper">
          <label className="input-label">Дата</label>
          <input
            type="date"
            className="date-input"
            value={addDate}
            onChange={(e) => setAddDate(e.target.value)}
            max={getDateKey(Date.now())}
          />
        </div>
        <div className="time-input-wrapper">
          <label className="input-label">Время</label>
          <div className="time-inputs">
            <input
              type="number"
              className="time-input-field"
              value={addHours}
              onChange={(e) => {
                const val = e.target.value.slice(0, 2)
                if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 23))
                  setAddHours(val)
              }}
              min="0"
              max="23"
              placeholder="00"
            />
            <span className="time-separator">:</span>
            <input
              type="number"
              className="time-input-field"
              value={addMinutes}
              onChange={(e) => {
                const val = e.target.value.slice(0, 2)
                if (val === '' || (parseInt(val, 10) >= 0 && parseInt(val, 10) <= 59))
                  setAddMinutes(val)
              }}
              min="0"
              max="59"
              placeholder="00"
            />
          </div>
        </div>
        <div className="modal-buttons">
          <button className="modal-btn cancel" onClick={onClose}>
            Отмена
          </button>
          <button className="modal-btn save" onClick={onSave}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}
