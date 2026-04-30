import { useEffect, useRef } from 'react'

const ICON = '/favicon.svg'

export function sendNotification(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  new Notification(title, { body, icon: ICON })
}

export function useNotifications(settings) {
  const lastReminderDay = useRef(null)

  useEffect(() => {
    if (!settings?.enabled || !settings?.dailyReminder) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const [targetH, targetM] = (settings.dailyReminderTime || '20:00').split(':').map(Number)

    const interval = setInterval(() => {
      const now = new Date()
      const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
      if (
        now.getHours() === targetH &&
        now.getMinutes() === targetM &&
        lastReminderDay.current !== dayKey
      ) {
        lastReminderDay.current = dayKey
        sendNotification('Smoke Free', 'Не забудьте зафиксировать все сигареты за сегодня!')
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [settings?.enabled, settings?.dailyReminder, settings?.dailyReminderTime])
}
