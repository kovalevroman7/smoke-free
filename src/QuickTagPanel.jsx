import { useCallback, useEffect, useRef, useState } from 'react'

const AUTO_CLOSE_DELAY = 8000

/** Необязательная панель тегирования только что добавленной сигареты. */
export default function QuickTagPanel({
  timestamp,
  tags,
  selectedTag,
  onSelectTag,
  onAddCustomTag,
  onDeleteTag,
  onUndo,
  onClose,
}) {
  const [addingTag, setAddingTag] = useState(false)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const timerRef = useRef(null)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)

  const finishEditing = useCallback(() => {
    longPressTriggeredRef.current = false
    setIsEditingTags(false)
  }, [])

  const resetAutoClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!isEditingTags) timerRef.current = setTimeout(onClose, AUTO_CLOSE_DELAY)
  }, [isEditingTags, onClose])

  useEffect(() => {
    resetAutoClose()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [resetAutoClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape' || addingTag) return
      if (isEditingTags) finishEditing()
      else onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [addingTag, finishEditing, isEditingTags, onClose])

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

  const selectTag = (tag) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
    if (!isEditingTags) onSelectTag(tag)
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
    <div
      className="quick-tag-overlay"
      role="presentation"
      onClick={handleOverlayClick}
      onPointerDownCapture={resetAutoClose}
      onKeyDownCapture={resetAutoClose}
    >
      <section
        className="quick-tag-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-tag-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quick-tag-header">
          <div>
            <strong id="quick-tag-title">Сигарета добавлена</strong>
            <span>
              {new Date(timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          {isEditingTags ? (
            <button className="quick-tag-done" type="button" onClick={finishEditing}>
              Готово
            </button>
          ) : (
            <button
              className="quick-tag-close"
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
            >
              ×
            </button>
          )}
        </div>

        <p className="quick-tag-hint">
          {isEditingTags
            ? 'Нажмите на крестик, чтобы удалить тег'
            : 'Удерживайте тег, чтобы удалить'}
        </p>

        <div className={`quick-tag-chips ${isEditingTags ? 'editing' : ''}`}>
          {tags.map((tag) => (
            <div className="quick-tag-item" key={tag}>
              <button
                type="button"
                className={`quick-tag-chip ${selectedTag === tag ? 'active' : ''}`}
                onPointerDown={startLongPress}
                onPointerUp={stopLongPress}
                onPointerLeave={stopLongPress}
                onPointerCancel={stopLongPress}
                onContextMenu={(event) => event.preventDefault()}
                onClick={() => selectTag(tag)}
              >
                {tag}
              </button>
              {isEditingTags && (
                <button
                  className="quick-tag-delete"
                  type="button"
                  aria-label={`Удалить тег ${tag}`}
                  onClick={() => onDeleteTag(tag)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {tags.length === 0 && isEditingTags && (
            <span className="quick-tag-empty">Тегов больше нет</span>
          )}
          {!isEditingTags && addingTag ? (
            <input
              className="quick-tag-input"
              type="text"
              value={newTagName}
              placeholder="Название"
              maxLength={30}
              autoFocus
              onChange={(event) => setNewTagName(event.target.value)}
              onBlur={confirmNewTag}
              onKeyDown={(event) => {
                if (event.key === 'Enter') confirmNewTag()
                if (event.key === 'Escape') {
                  setNewTagName('')
                  setAddingTag(false)
                }
              }}
            />
          ) : !isEditingTags ? (
            <button
              className="quick-tag-chip quick-tag-add"
              type="button"
              onClick={() => setAddingTag(true)}
            >
              + Другой
            </button>
          ) : null}
        </div>

        <button className="quick-tag-undo" type="button" onClick={onUndo}>
          Отменить добавление
        </button>
      </section>
    </div>
  )
}
