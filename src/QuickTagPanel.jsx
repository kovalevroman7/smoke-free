import { useCallback, useEffect, useRef, useState } from 'react'

const AUTO_CLOSE_DELAY = 8000

/** Необязательная панель тегирования только что добавленной сигареты. */
export default function QuickTagPanel({
  timestamp,
  tags,
  selectedTag,
  onSelectTag,
  onAddCustomTag,
  onUndo,
  onClose,
}) {
  const [addingTag, setAddingTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const timerRef = useRef(null)

  const resetAutoClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onClose, AUTO_CLOSE_DELAY)
  }, [onClose])

  useEffect(() => {
    resetAutoClose()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [resetAutoClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !addingTag) onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [addingTag, onClose])

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
      onClick={onClose}
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
          <button className="quick-tag-close" type="button" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <p className="quick-tag-hint">Почему вы закурили?</p>

        <div className="quick-tag-chips">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`quick-tag-chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => onSelectTag(tag)}
            >
              {tag}
            </button>
          ))}
          {addingTag ? (
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
          ) : (
            <button
              className="quick-tag-chip quick-tag-add"
              type="button"
              onClick={() => setAddingTag(true)}
            >
              + Другой
            </button>
          )}
        </div>

        <button className="quick-tag-undo" type="button" onClick={onUndo}>
          Отменить добавление
        </button>
      </section>
    </div>
  )
}
