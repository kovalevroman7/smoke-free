import { useEffect, useMemo, useState } from 'react'
import { formatDate, getDateKey } from './utils.js'

const ASSET_PATH = `${import.meta.env.BASE_URL}figma-assets/journal`
const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

function getMonthKey(timestamp = Date.now()) {
  return getDateKey(timestamp).slice(0, 7)
}

function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonth(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function formatCigaretteCount(count) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return `${count} сигарета`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} сигареты`
  }
  return `${count} сигарет`
}

function formatInterval(milliseconds) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `+${minutes}м с предыдущей`
  if (minutes === 0) return `+${hours}ч с предыдущей`
  return `+${hours}ч ${minutes}м с предыдущей`
}

function getAverageIntervalMinutes(entries) {
  if (entries.length < 2) return 0
  const totalInterval = entries[entries.length - 1].timestamp - entries[0].timestamp
  return Math.round(totalInterval / (entries.length - 1) / 60000)
}

function formatAverageInterval(minutes) {
  if (minutes <= 60) return `${minutes} мин.`
  return `${Math.floor(minutes / 60)} ч. ${minutes % 60} мин.`
}

/** Помесячный журнал сигарет, сгруппированный по логическим дням пользователя. */
export default function JournalTab({ data, onOpenAddModal, onStartEditing, onDeleteByIndex }) {
  const currentMonth = getMonthKey()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [expandedDay, setExpandedDay] = useState(null)

  const dayGroups = useMemo(() => {
    const groups = new Map()

    data.cigarettes.forEach((timestamp, originalIndex) => {
      const dayKey = getDateKey(timestamp)
      if (!dayKey.startsWith(`${selectedMonth}-`)) return
      if (!groups.has(dayKey)) groups.set(dayKey, [])
      groups.get(dayKey).push({ timestamp, originalIndex })
    })

    return [...groups.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([dayKey, entries]) => ({
        dayKey,
        entries: entries.sort((left, right) => left.timestamp - right.timestamp),
      }))
  }, [data.cigarettes, selectedMonth])

  const dayKeys = dayGroups.map(({ dayKey }) => dayKey).join(',')
  const firstDayKey = dayGroups[0]?.dayKey ?? null

  useEffect(() => {
    setExpandedDay(firstDayKey)
  }, [selectedMonth, dayKeys, firstDayKey])

  const goToPreviousMonth = () => setSelectedMonth((month) => shiftMonth(month, -1))
  const goToNextMonth = () => {
    setSelectedMonth((month) => (month < currentMonth ? shiftMonth(month, 1) : month))
  }

  return (
    <section className="journal" aria-labelledby="journal-title">
      <h1 id="journal-title" className="journal-title">
        История
      </h1>

      <div className="journal-month-navigation">
        <button
          type="button"
          className="journal-month-button"
          onClick={goToPreviousMonth}
          aria-label="Предыдущий месяц"
        >
          <img src={`${ASSET_PATH}/chevron-left.svg`} alt="" />
        </button>
        <strong className="journal-month-label">{formatMonth(selectedMonth)}</strong>
        <button
          type="button"
          className="journal-month-button"
          onClick={goToNextMonth}
          disabled={selectedMonth >= currentMonth}
          aria-label="Следующий месяц"
        >
          <img src={`${ASSET_PATH}/chevron-right.svg`} alt="" />
        </button>
      </div>

      <button type="button" className="journal-add-button" onClick={onOpenAddModal}>
        <img src={`${ASSET_PATH}/lock.svg`} alt="" />
        Добавить забытую сигарету
      </button>

      <div className="journal-days">
        {dayGroups.length === 0 ? (
          <div className="journal-empty">Нет записей за этот месяц</div>
        ) : (
          dayGroups.map(({ dayKey, entries }) => {
            const isExpanded = expandedDay === dayKey
            const averageIntervalMinutes = getAverageIntervalMinutes(entries)

            return (
              <article className={`journal-day-card ${isExpanded ? 'expanded' : ''}`} key={dayKey}>
                <button
                  type="button"
                  className="journal-day-header"
                  onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                  aria-expanded={isExpanded}
                >
                  <span className="journal-day-date">{formatDate(dayKey)}</span>
                  <span className="journal-day-summary">
                    <strong>{formatCigaretteCount(entries.length)}</strong>
                    <span>Средний интервал - {formatAverageInterval(averageIntervalMinutes)}</span>
                  </span>
                  <img
                    className="journal-day-chevron"
                    src={`${ASSET_PATH}/${isExpanded ? 'chevron-up' : 'chevron-down'}.svg`}
                    alt=""
                  />
                </button>

                {isExpanded && (
                  <div className="journal-entries">
                    {[...entries].reverse().map(({ timestamp, originalIndex }, reverseIndex) => {
                      const chronologicalIndex = entries.length - reverseIndex - 1
                      const previousTimestamp = entries[chronologicalIndex - 1]?.timestamp
                      const tag = (data.cigaretteTags || {})[timestamp]

                      return (
                        <div className="journal-entry" key={`${timestamp}-${originalIndex}`}>
                          <span className="journal-entry-index">{chronologicalIndex + 1}</span>
                          <span className="journal-entry-details">
                            <span className="journal-entry-time-row">
                              <strong>
                                {new Date(timestamp).toLocaleTimeString('ru-RU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </strong>
                              {tag && <span className="journal-entry-tag">{tag}</span>}
                            </span>
                            <span className="journal-entry-interval">
                              {previousTimestamp === undefined
                                ? 'Первая за день'
                                : formatInterval(timestamp - previousTimestamp)}
                            </span>
                          </span>
                          <span className="journal-entry-actions">
                            <button
                              type="button"
                              onClick={() => onStartEditing(timestamp, originalIndex)}
                              aria-label={`Редактировать запись ${new Date(
                                timestamp
                              ).toLocaleTimeString('ru-RU', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`}
                            >
                              <img src={`${ASSET_PATH}/pencil.svg`} alt="" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteByIndex(originalIndex)}
                              aria-label={`Удалить запись ${new Date(timestamp).toLocaleTimeString(
                                'ru-RU',
                                { hour: '2-digit', minute: '2-digit' }
                              )}`}
                            >
                              <img src={`${ASSET_PATH}/trash.svg`} alt="" />
                            </button>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}
