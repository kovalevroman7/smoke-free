import { useState, useEffect, useRef } from 'react'

/** Элемент списка со свайпом влево для показа кнопок редактирования и удаления. */
export default function SwipeableItem({ children, onEdit, onDelete, isOpen, onToggle }) {
  const startX = useRef(0)
  const currentX = useRef(0)
  const containerRef = useRef(null)
  const [offset, setOffset] = useState(0)
  const actionsWidth = 100

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    currentX.current = offset
  }

  const handleTouchMove = (e) => {
    const diff = startX.current - e.touches[0].clientX
    let newOffset = currentX.current + diff
    if (newOffset < 0) newOffset = 0
    if (newOffset > actionsWidth) newOffset = actionsWidth
    setOffset(newOffset)
  }

  const handleTouchEnd = () => {
    if (offset > actionsWidth / 2) {
      setOffset(actionsWidth)
      onToggle(true)
    } else {
      setOffset(0)
      onToggle(false)
    }
  }

  useEffect(() => {
    if (!isOpen) setOffset(0)
  }, [isOpen])

  return (
    <div className="swipeable-container">
      <div className="swipeable-actions">
        <button className="swipe-btn edit" onClick={onEdit}>
          ✏️
        </button>
        <button className="swipe-btn delete" onClick={onDelete}>
          🗑️
        </button>
      </div>
      <div
        ref={containerRef}
        className="swipeable-content"
        style={{ transform: `translateX(-${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
