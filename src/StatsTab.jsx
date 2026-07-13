import SwipeableItem from './SwipeableItem.jsx'
import { getDateKey, formatDate, getDayOfWeek, getHourlyCounts } from './utils.js'
import { getCompactGoalLabel, getGoalDayStatus, getPromiseStreak } from './goalUtils.js'
import { GOAL_TYPES, getGoalCategory } from './goalTypes.js'

/** Вкладка статистики: сводка, столбчатый график, цели за период, детальный просмотр дня. */
export default function StatsTab({
  data,
  statsPeriod,
  setStatsPeriod,
  selectedDay,
  setSelectedDay,
  openSwipeIndex,
  setOpenSwipeIndex,
  onStartEditing,
  onDeleteByIndex,
}) {
  const todayKey = getDateKey(Date.now())

  const periodDays = (() => {
    if (statsPeriod === 'week') {
      const today = new Date()
      const dayOfWeek = (today.getDay() + 6) % 7
      const monday = new Date(today)
      monday.setDate(today.getDate() - dayOfWeek)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        return getDateKey(d.getTime())
      })
    }
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      return getDateKey(date.getTime())
    })
  })()

  const prevPeriodDays = (() => {
    if (statsPeriod === 'week') {
      const today = new Date()
      const dayOfWeek = (today.getDay() + 6) % 7
      const prevMonday = new Date(today)
      prevMonday.setDate(today.getDate() - dayOfWeek - 7)
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(prevMonday)
        d.setDate(prevMonday.getDate() + i)
        return getDateKey(d.getTime())
      })
    }
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (59 - i))
      return getDateKey(date.getTime())
    })
  })()

  const dailyCounts = periodDays.map((day) => ({
    day,
    count: data.cigarettes.filter((t) => getDateKey(t) === day).length,
  }))

  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1)
  const periodTotal = dailyCounts.reduce((sum, d) => sum + d.count, 0)
  const elapsedDays = periodDays.filter((d) => d <= todayKey).length || 1
  const periodAvg = periodTotal / elapsedDays
  const periodCost =
    data.packPrice && data.cigarettesPerPack
      ? (periodTotal / data.cigarettesPerPack) * data.packPrice
      : 0
  const prevPeriodTotal = prevPeriodDays.reduce(
    (sum, day) => sum + data.cigarettes.filter((t) => getDateKey(t) === day).length,
    0
  )
  const periodDelta =
    prevPeriodTotal === 0 ? null : (periodTotal - prevPeriodTotal) / prevPeriodTotal

  return (
    <div className="stats-card">
      <h2 style={{ marginBottom: 16 }}>
        {statsPeriod === 'week' ? 'Статистика за неделю' : 'Статистика за месяц'}
      </h2>

      <div className="period-switcher">
        <button
          className={`period-switcher-btn ${statsPeriod === 'week' ? 'active' : ''}`}
          onClick={() => setStatsPeriod('week')}
        >
          Неделя
        </button>
        <button
          className={`period-switcher-btn ${statsPeriod === 'month' ? 'active' : ''}`}
          onClick={() => setStatsPeriod('month')}
        >
          Месяц
        </button>
      </div>

      <div style={{ marginBottom: 20, padding: '16px', background: 'var(--bg)', borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {statsPeriod === 'week' ? 'Всего за неделю' : 'Всего за месяц'}
          </span>
          <strong>{periodTotal} шт</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>В среднем в день</span>
          <strong>{periodAvg.toFixed(1)} шт</strong>
        </div>
        {data.packPrice > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 8,
              marginBottom: 8,
              borderTop: '1px solid var(--border)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              {statsPeriod === 'week' ? 'Потрачено за неделю' : 'Потрачено за месяц'}
            </span>
            <strong style={{ color: 'var(--danger)' }}>{periodCost.toFixed(0)} ₽</strong>
          </div>
        )}
        <div className="comparison-row">
          <span style={{ color: 'var(--text-secondary)' }}>
            {statsPeriod === 'week' ? 'К прошлой неделе' : 'К прошлому месяцу'}
          </span>
          {periodDelta === null ? (
            <span style={{ color: 'var(--text-secondary)' }}>нет данных</span>
          ) : (
            (() => {
              const pct = Math.round(Math.abs(periodDelta) * 100)
              const up = periodDelta > 0
              const flat = pct === 0
              const color = flat ? 'var(--text-secondary)' : up ? 'var(--danger)' : 'var(--success)'
              const arrow = flat ? '→' : up ? '↑' : '↓'
              return (
                <strong style={{ color }}>
                  {arrow} {pct}%
                </strong>
              )
            })()
          )}
        </div>
      </div>

      <div className={`chart ${statsPeriod === 'month' ? 'chart--month' : ''}`}>
        {dailyCounts.map(({ day, count }, i) => {
          const date = new Date(day)
          const dayOfMonth = date.getDate()
          const showLabel =
            statsPeriod === 'week'
              ? true
              : i === 0 || i === dailyCounts.length - 1 || dayOfMonth === 1 || dayOfMonth % 5 === 0
          const label = statsPeriod === 'week' ? getDayOfWeek(day) : String(dayOfMonth)
          return (
            <div
              key={day}
              className={`chart-bar-wrapper ${selectedDay === day ? 'selected' : ''}`}
              onClick={() => setSelectedDay(selectedDay === day ? null : day)}
              style={{ cursor: 'pointer' }}
            >
              <span className="chart-count">{count}</span>
              <div className="chart-bar" style={{ height: `${(count / maxCount) * 100}px` }} />
              <span className="chart-label">{showLabel ? label : ''}</span>
            </div>
          )
        })}
      </div>

      {(data.goals || []).length > 0 &&
        (() => {
          const goals = (data.goals || []).filter((goal) => getGoalCategory(goal) === 'rule')
          if (goals.length === 0) return null
          const isMonth = statsPeriod === 'month'
          const weekdayLabels = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
          const leadingEmpty = isMonth ? (new Date(periodDays[0]).getDay() + 6) % 7 : 0
          const trailingEmpty = isMonth
            ? 6 - ((new Date(periodDays[periodDays.length - 1]).getDay() + 6) % 7)
            : 0
          return (
            <div className={`goals-week-block ${isMonth ? 'month' : ''}`}>
              <div className="goals-week-title">
                {isMonth ? 'Правила за месяц' : 'Правила за неделю'}
              </div>
              <div className="goals-week-days">
                {isMonth
                  ? weekdayLabels.map((wd) => (
                      <div key={wd} className="goals-week-day-label">
                        {wd}
                      </div>
                    ))
                  : periodDays.map((day) => (
                      <div key={day} className="goals-week-day-label">
                        {getDayOfWeek(day)}
                      </div>
                    ))}
              </div>
              {goals.map((goal) => {
                const meta = GOAL_TYPES[goal.type]
                const goalStartKey = goal.createdAt ? getDateKey(goal.createdAt) : periodDays[0]
                return (
                  <div key={goal.id} className="goals-week-goal">
                    <div className="goals-week-goal-header">
                      <span className="goals-week-goal-icon">{meta?.icon}</span>
                      <span className="goals-week-goal-label">{getCompactGoalLabel(goal)}</span>
                    </div>
                    <div className="goals-week-cells">
                      {Array.from({ length: leadingEmpty }, (_, i) => (
                        <div key={`lead-${i}`} className="goals-week-cell empty" />
                      ))}
                      {periodDays.map((day) => {
                        if (day < goalStartKey)
                          return (
                            <div key={day} className="goals-week-cell na">
                              ·
                            </div>
                          )
                        if (day > todayKey)
                          return <div key={day} className="goals-week-cell empty" />
                        const dayCigs = data.cigarettes.filter((t) => getDateKey(t) === day)
                        const status = getGoalDayStatus(goal, dayCigs, day)
                        const symbol = status === 'success' ? '✓' : status === 'fail' ? '✗' : '·'
                        return (
                          <div key={day} className={`goals-week-cell ${status}`}>
                            {symbol}
                          </div>
                        )
                      })}
                      {Array.from({ length: trailingEmpty }, (_, i) => (
                        <div key={`tail-${i}`} className="goals-week-cell empty" />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

      {(data.goals || []).length > 0 &&
        (() => {
          const promises = (data.goals || []).filter((goal) => getGoalCategory(goal) === 'promise')
          if (promises.length === 0) return null
          const isMonth = statsPeriod === 'month'
          const weekdayLabels = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
          const leadingEmpty = isMonth ? (new Date(periodDays[0]).getDay() + 6) % 7 : 0
          const trailingEmpty = isMonth
            ? 6 - ((new Date(periodDays[periodDays.length - 1]).getDay() + 6) % 7)
            : 0
          return (
            <div className={`goals-week-block ${isMonth ? 'month' : ''}`}>
              <div className="goals-week-title">Обещания</div>
              <div className="goals-week-days">
                {isMonth
                  ? weekdayLabels.map((wd) => (
                      <div key={wd} className="goals-week-day-label">
                        {wd}
                      </div>
                    ))
                  : periodDays.map((day) => (
                      <div key={day} className="goals-week-day-label">
                        {getDayOfWeek(day)}
                      </div>
                    ))}
              </div>
              {promises.map((goal) => {
                const meta = GOAL_TYPES[goal.type]
                const goalStartKey = goal.createdAt ? getDateKey(goal.createdAt) : periodDays[0]
                const done = new Set(goal.completedDates || [])
                const { current, best } = getPromiseStreak(goal)
                return (
                  <div key={goal.id} className="goals-week-goal">
                    <div className="goals-week-goal-header">
                      <span className="goals-week-goal-icon">{meta?.icon}</span>
                      <span className="goals-week-goal-label">{getCompactGoalLabel(goal)}</span>
                      <span className="goals-week-goal-streak">
                        🔥 {current} · рекорд {best}
                      </span>
                    </div>
                    <div className="goals-week-cells">
                      {Array.from({ length: leadingEmpty }, (_, i) => (
                        <div key={`lead-${i}`} className="goals-week-cell empty" />
                      ))}
                      {periodDays.map((day) => {
                        if (day < goalStartKey)
                          return (
                            <div key={day} className="goals-week-cell na">
                              ·
                            </div>
                          )
                        if (day > todayKey)
                          return <div key={day} className="goals-week-cell empty" />
                        const isDone = done.has(day)
                        return (
                          <div
                            key={day}
                            className={`goals-week-cell ${isDone ? 'success' : 'pending'}`}
                          >
                            {isDone ? '✓' : '·'}
                          </div>
                        )
                      })}
                      {Array.from({ length: trailingEmpty }, (_, i) => (
                        <div key={`tail-${i}`} className="goals-week-cell empty" />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

      {selectedDay && (
        <div className="day-detail">
          <div className="day-detail-header">
            <h3>{formatDate(selectedDay)}</h3>
            <button className="close-btn" onClick={() => setSelectedDay(null)}>
              ×
            </button>
          </div>
          <p className="day-detail-subtitle">Распределение по часам</p>
          <div className="hourly-chart">
            {(() => {
              const hourly = getHourlyCounts(data.cigarettes, selectedDay)
              const maxHourly = Math.max(...hourly.map((h) => h.count), 1)
              return hourly.map(({ hour, count }) => (
                <div key={hour} className="hourly-bar-wrapper">
                  {count > 0 && <span className="hourly-count">{count}</span>}
                  <div
                    className="hourly-bar"
                    style={{ height: `${(count / maxHourly) * 60}px` }}
                    title={`${hour}:00 - ${count} шт`}
                  />
                  {hour % 6 === 0 && <span className="hourly-label">{hour}</span>}
                </div>
              ))
            })()}
          </div>
          <div className="hourly-legend">
            <span>00:00</span>
            <span>12:00</span>
            <span>23:00</span>
          </div>

          {(data.goals || []).length > 0 &&
            (() => {
              const dayCigs = data.cigarettes.filter((t) => getDateKey(t) === selectedDay)
              const visibleGoals = data.goals.filter(
                (goal) =>
                  getGoalCategory(goal) === 'rule' &&
                  (!goal.createdAt || getDateKey(goal.createdAt) <= selectedDay)
              )
              if (visibleGoals.length === 0) return null
              return (
                <div>
                  <p className="day-detail-subtitle" style={{ marginTop: 20, marginBottom: 8 }}>
                    Правила за день
                  </p>
                  <div className="day-goals-list">
                    {visibleGoals.map((goal) => {
                      const status = getGoalDayStatus(goal, dayCigs, selectedDay)
                      const meta = GOAL_TYPES[goal.type]
                      const symbol = status === 'success' ? '✓' : status === 'fail' ? '✗' : '…'
                      return (
                        <div key={goal.id} className={`day-goal-item ${status}`}>
                          <span>{meta?.icon}</span>
                          <span style={{ flex: 1 }}>{getCompactGoalLabel(goal)}</span>
                          <span style={{ fontWeight: 600 }}>{symbol}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

          <div className="day-cigarettes-list">
            <p className="day-detail-subtitle" style={{ marginTop: 20, marginBottom: 12 }}>
              Все записи
            </p>
            {(() => {
              const dayCigarettes = data.cigarettes
                .filter((t) => getDateKey(t) === selectedDay)
                .sort((a, b) => b - a)
              if (dayCigarettes.length === 0)
                return (
                  <div className="empty-state" style={{ padding: '16px 0' }}>
                    Нет записей
                  </div>
                )
              return (
                <div className="history-list">
                  {dayCigarettes.map((time, i) => {
                    const originalIndex = data.cigarettes.indexOf(time)
                    return (
                      <SwipeableItem
                        key={time}
                        isOpen={openSwipeIndex === originalIndex}
                        onToggle={(isOpen) => setOpenSwipeIndex(isOpen ? originalIndex : null)}
                        onEdit={() => {
                          onStartEditing(time, originalIndex)
                          setOpenSwipeIndex(null)
                        }}
                        onDelete={() => onDeleteByIndex(originalIndex)}
                      >
                        <div className="history-item">
                          <span className="history-time">
                            {new Date(time).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="history-ago">#{dayCigarettes.length - i}</span>
                        </div>
                      </SwipeableItem>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
