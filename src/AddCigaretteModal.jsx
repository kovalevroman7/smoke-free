import { useCallback, useEffect, useRef, useState } from 'react'
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
  hiddenTags = [],
  selectedTag,
  setSelectedTag,
  onAddCustomTag,
  onDeleteTag,
  onSave,
  onClose,
}) {
  const [addingTag, setAddingTag] = useState(false)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)

  const tags = [...DEFAULT_TAGS.filter((tag) => !hiddenTags.includes(tag)), ...customTags]

  const finishEditing = useCallback(() => {
    longPressTriggeredRef.current = false
    setIsEditingTags(false)
  }, [])

  useEffect(
    () => () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    },
    []
  )

  useEffect(() => {
    if (!isEditingTags) return undefined
    const finishOnEscape = (event) => {
      if (event.key === 'Escape' && !addingTag) finishEditing()
    }
    document.addEventListener('keydown', finishOnEscape)
    return () => document.removeEventListener('keydown', finishOnEscape)
  }, [addingTag, finishEditing, isEditingTags])

  const startLongPress = () => {
    if (isEditingTags) return
    longPressTriggeredRef.current = false
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      setIsEditingTags(true)
      if (typeof navigator.vibrate === 'function') navigator.vibrate(30)
    }, 500)
  }

  const stopLongPress = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
  }

  const toggleTag = (tag) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    if (isEditingTags) return
    setSelectedTag(selectedTag === tag ? '' : tag)
  }

  const deleteTag = (tag) => {
    if (selectedTag === tag) setSelectedTag('')
    onDeleteTag(tag)
  }

  const handleOverlayClick = () => {
    if (isEditingTags) finishEditing()
    else onClose()
  }

  const confirmNewTag = () => {
    const trimmed = newTagName.trim()
    if (trimmed) onAddCustomTag(trimmed)
    setNewTagName('')
    setAddingTag(false)
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
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
          <div className="tag-input-header">
            <label className="input-label">Тэг</label>
            {isEditingTags && (
              <button className="tag-edit-done" type="button" onClick={finishEditing}>
                Готово
              </button>
            )}
          </div>
          <p className="tag-edit-hint">
            {isEditingTags
              ? 'Нажмите на крестик, чтобы удалить тег'
              : 'Удерживайте тег, чтобы удалить'}
          </p>
          <div className={`tag-chips ${isEditingTags ? 'editing' : ''}`}>
            {tags.map((tag) => (
              <div className="tag-chip-item" key={tag}>
                <button
                  type="button"
                  className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
                  onPointerDown={startLongPress}
                  onPointerUp={stopLongPress}
                  onPointerLeave={stopLongPress}
                  onPointerCancel={stopLongPress}
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
                {isEditingTags && (
                  <button
                    className="tag-chip-delete"
                    type="button"
                    aria-label={`Удалить тег ${tag}`}
                    onClick={() => deleteTag(tag)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {tags.length === 0 && isEditingTags && (
              <span className="tag-edit-empty">Тегов больше нет</span>
            )}
            {!isEditingTags && addingTag ? (
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
            ) : !isEditingTags ? (
              <button
                type="button"
                className="tag-chip tag-chip-add"
                onClick={() => setAddingTag(true)}
              >
                + Тэг
              </button>
            ) : null}
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
