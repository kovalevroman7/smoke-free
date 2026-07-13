import { useState } from 'react'
import { getDateKey, DEFAULT_TAGS } from './utils.js'

/** Модалка ручного добавления записи о курении с выбором даты, времени и тэга. */
export default function AddCigaretteModal({
  addDate,
  setAddDate,
  addHours,
  setAddHours,
  addMinutes,
  setAddMinutes,
  customTags = [],
  selectedTag,
  setSelectedTag,
  onAddCustomTag,
  onSave,
  onClose,
}) {
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  const tags = [...DEFAULT_TAGS, ...customTags]

  const toggleTag = (tag) => {
    setSelectedTag(selectedTag === tag ? '' : tag)
  }

  const confirmNewTag = () => {
    const trimmed = newTagName.trim()
    if (trimmed) onAddCustomTag(trimmed)
    setNewTagName('')
    setAddingTag(false)
  }

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
        <div className="tag-input-wrapper">
          <label className="input-label">Тэг</label>
          <div className="tag-chips">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
            {addingTag ? (
              <input
                type="text"
                className="tag-chip-input"
                placeholder="Название"
                value={newTagName}
                maxLength={30}
                autoFocus
                onChange={(e) => setNewTagName(e.target.value)}
                onBlur={confirmNewTag}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmNewTag()
                  if (e.key === 'Escape') {
                    setNewTagName('')
                    setAddingTag(false)
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="tag-chip tag-chip-add"
                onClick={() => setAddingTag(true)}
              >
                + Тэг
              </button>
            )}
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
