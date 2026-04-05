import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'smoke-free-data'

function loadData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : { cigarettes: [] }
  } catch {
    return { cigarettes: [] }
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function formatTime(ms) {
  if (ms < 0) ms = 0
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const s = seconds % 60
  const m = minutes % 60
  const h = hours

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)

  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  if (hours < 24) return `${hours} ч назад`
  return `${Math.floor(hours / 24)} дн назад`
}

function getDateKey(timestamp) {
  const date = new Date(timestamp)
  return date.toISOString().split('T')[0]
}

function formatDate(dateKey) {
  const date = new Date(dateKey)
  const today = getDateKey(Date.now())
  const yesterday = getDateKey(Date.now() - 86400000)

  if (dateKey === today) return 'Сегодня'
  if (dateKey === yesterday) return 'Вчера'

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function getDayOfWeek(dateKey) {
  const date = new Date(dateKey)
  return date.toLocaleDateString('ru-RU', { weekday: 'short' })
}

function App() {
  const [data, setData] = useState(loadData)
  const [timeSinceLast, setTimeSinceLast] = useState(0)
  const [activeTab, setActiveTab] = useState('home')

  const lastCigarette = data.cigarettes[data.cigarettes.length - 1]

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastCigarette) {
        setTimeSinceLast(Date.now() - lastCigarette)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lastCigarette])

  useEffect(() => {
    saveData(data)
  }, [data])

  const addCigarette = useCallback(() => {
    setData(prev => ({
      ...prev,
      cigarettes: [...prev.cigarettes, Date.now()]
    }))
  }, [])

  const todayKey = getDateKey(Date.now())
  const todayCount = data.cigarettes.filter(t => getDateKey(t) === todayKey).length

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return getDateKey(date.getTime())
  })

  const dailyCounts = last7Days.map(day => ({
    day,
    count: data.cigarettes.filter(t => getDateKey(t) === day).length
  }))

  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1)

  const todayCigarettes = data.cigarettes
    .filter(t => getDateKey(t) === todayKey)
    .sort((a, b) => b - a)

  const getTimerClass = () => {
    const hours = timeSinceLast / 3600000
    if (hours < 1) return 'danger'
    if (hours < 2) return 'warning'
    return ''
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Smoke Free</h1>
        <p>Каждая минута без сигареты — победа</p>
      </header>

      {activeTab === 'home' && (
        <>
          <div className="timer-card">
            <div className="timer-label">
              {lastCigarette ? 'Времени без сигареты' : 'Начните отслеживание'}
            </div>
            <div className={`timer-value ${getTimerClass()}`}>
              {lastCigarette ? formatTime(timeSinceLast) : '—:—:—'}
            </div>
          </div>

          <button className="smoke-btn" onClick={addCigarette}>
            Выкурил сигарету
          </button>

          <div className="stats-card">
            <div className="stats-header">
              <h2>Сегодня</h2>
              <span className="today-count">{todayCount} шт</span>
            </div>

            {todayCigarettes.length > 0 ? (
              <div className="history-list">
                {todayCigarettes.slice(0, 5).map((time, i) => (
                  <div key={i} className="history-item">
                    <span className="history-time">
                      {new Date(time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="history-ago">{formatTimeAgo(time)}</span>
                  </div>
                ))}
                {todayCigarettes.length > 5 && (
                  <div className="history-item" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    и ещё {todayCigarettes.length - 5}...
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                Пока нет записей за сегодня
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'stats' && (
        <div className="stats-card">
          <h2 style={{ marginBottom: 20 }}>Статистика за неделю</h2>

          <div className="chart">
            {dailyCounts.map(({ day, count }) => (
              <div key={day} className="chart-bar-wrapper">
                <span className="chart-count">{count}</span>
                <div
                  className="chart-bar"
                  style={{ height: `${(count / maxCount) * 100}px` }}
                />
                <span className="chart-label">{getDayOfWeek(day)}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, padding: '16px', background: 'var(--bg)', borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Всего за неделю</span>
              <strong>{dailyCounts.reduce((sum, d) => sum + d.count, 0)} шт</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>В среднем в день</span>
              <strong>{(dailyCounts.reduce((sum, d) => sum + d.count, 0) / 7).toFixed(1)} шт</strong>
            </div>
          </div>
        </div>
      )}

      <nav className="nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          Главная
        </button>
        <button
          className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="nav-icon">📊</span>
          Статистика
        </button>
      </nav>
    </div>
  )
}

export default App
