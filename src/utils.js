export const STORAGE_KEY = 'smoke-free-data'

export const DEFAULT_TAGS = ['Стресс', 'После еды', 'Кофе']

export const defaultData = {
  cigarettes: [],
  packPrice: 0,
  cigarettesPerPack: 20,
  goals: [],
  habits: [],
  dayStartHour: 0,
  customTags: [],
  hiddenTags: [],
  cigaretteTags: {},
  cigaretteAmounts: {},
}

let dayStartOffsetMs = 0

export function setDayStartHour(hour) {
  const h = Math.max(0, Math.min(12, Number(hour) || 0))
  dayStartOffsetMs = h * 3600000
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? { ...defaultData, ...JSON.parse(raw) } : defaultData
    parsed.goals = (parsed.goals || []).filter((goal) => goal.type !== 'custom')
    setDayStartHour(parsed.dayStartHour)
    return parsed
  } catch {
    setDayStartHour(defaultData.dayStartHour)
    return defaultData
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function formatTime(ms) {
  if (ms < 0) ms = 0
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const s = seconds % 60
  const m = minutes % 60
  const h = hours
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  if (hours < 24) return `${hours} ч назад`
  return `${Math.floor(hours / 24)} дн назад`
}

export function getDateKey(timestamp) {
  const date = new Date(timestamp - dayStartOffsetMs)
  const y = date.getFullYear()
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const d = date.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(dateKey) {
  const date = new Date(dateKey)
  const today = getDateKey(Date.now())
  const yesterday = getDateKey(Date.now() - 86400000)
  if (dateKey === today) return 'Сегодня'
  if (dateKey === yesterday) return 'Вчера'
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

export function getDayOfWeek(dateKey) {
  const date = new Date(dateKey)
  return date.toLocaleDateString('ru-RU', { weekday: 'short' })
}

export function getCigaretteAmount(cigaretteAmounts, timestamp) {
  const amount = Number(cigaretteAmounts?.[timestamp])
  return Number.isFinite(amount) && amount > 0 ? amount : 1
}

export function sumCigaretteAmounts(cigarettes, cigaretteAmounts) {
  return cigarettes.reduce(
    (total, timestamp) => total + getCigaretteAmount(cigaretteAmounts, timestamp),
    0
  )
}

export function formatCigaretteAmount(amount) {
  return Number(amount).toLocaleString('ru-RU', { maximumFractionDigits: 2 })
}

export function formatCigaretteFraction(amount) {
  return { 0.25: '¼', 0.5: '½', 0.75: '¾' }[amount] || formatCigaretteAmount(amount)
}

export function getHourlyCounts(cigarettes, dayKey, cigaretteAmounts) {
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
  cigarettes
    .filter((t) => getDateKey(t) === dayKey)
    .forEach((t) => {
      hours[new Date(t).getHours()].count += getCigaretteAmount(cigaretteAmounts, t)
    })
  return hours
}

export function getTodaySmokedCount(cigarettes, cigaretteAmounts) {
  const todayKey = getDateKey(Date.now())
  return sumCigaretteAmounts(
    cigarettes.filter((t) => getDateKey(t) === todayKey),
    cigaretteAmounts
  )
}
