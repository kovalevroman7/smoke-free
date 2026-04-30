/** Вкладка настроек: стоимость пачки, количество сигарет в пачке, час начала дня, уведомления. */
export default function SettingsTab({
  settingsPackPrice,
  setSettingsPackPrice,
  settingsCigarettesPerPack,
  setSettingsCigarettesPerPack,
  settingsDayStartHour,
  setSettingsDayStartHour,
  onSave,
  notifications,
  onUpdateNotifications,
}) {
  const notifSupported = typeof Notification !== 'undefined'
  const notifPermission = notifSupported ? Notification.permission : 'denied'

  async function handleToggleEnabled(e) {
    const checked = e.target.checked
    if (checked && notifPermission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    onUpdateNotifications({ enabled: checked })
  }

  return (
    <div className="stats-card">
      <h2 style={{ marginBottom: 20 }}>Настройки</h2>

      <div className="settings-section" style={{ marginBottom: 16 }}>
        <h3 className="settings-section-title">Стоимость сигарет</h3>
        <div className="settings-input-wrapper">
          <label className="input-label">Цена пачки (₽)</label>
          <input
            type="number"
            className="settings-input"
            value={settingsPackPrice}
            onChange={(e) => setSettingsPackPrice(e.target.value)}
            placeholder="0"
            min="0"
          />
        </div>
        <div className="settings-input-wrapper">
          <label className="input-label">Сигарет в пачке</label>
          <input
            type="number"
            className="settings-input"
            value={settingsCigarettesPerPack}
            onChange={(e) => setSettingsCigarettesPerPack(e.target.value)}
            placeholder="20"
            min="1"
          />
        </div>
        <div className="settings-input-wrapper">
          <label className="input-label">Час начала нового дня (0–12)</label>
          <input
            type="number"
            className="settings-input"
            value={settingsDayStartHour}
            onChange={(e) => setSettingsDayStartHour(e.target.value)}
            placeholder="0"
            min="0"
            max="12"
          />
          <p style={{ marginTop: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            Активность до этого часа считается прошедшим днём. Например, при значении 4 сигарета в
            02:00 относится ко вчера.
          </p>
        </div>
        <button className="save-settings-btn" onClick={onSave}>
          Сохранить
        </button>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">Уведомления</h3>

        {!notifSupported && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Ваш браузер не поддерживает уведомления.
          </p>
        )}

        {notifSupported && (
          <>
            <div className="notif-row">
              <div>
                <div className="notif-row-title">Включить уведомления</div>
                {notifPermission === 'denied' && (
                  <div className="notif-row-hint">Разрешите уведомления в настройках браузера</div>
                )}
              </div>
              <label className="goal-toggle">
                <input
                  type="checkbox"
                  checked={notifications.enabled && notifPermission === 'granted'}
                  disabled={notifPermission === 'denied'}
                  onChange={handleToggleEnabled}
                />
                <span className="goal-toggle-slider" />
              </label>
            </div>

            {notifications.enabled && notifPermission === 'granted' && (
              <>
                <div className="notif-row">
                  <div className="notif-row-title">Ежедневное напоминание</div>
                  <label className="goal-toggle">
                    <input
                      type="checkbox"
                      checked={notifications.dailyReminder}
                      onChange={(e) => onUpdateNotifications({ dailyReminder: e.target.checked })}
                    />
                    <span className="goal-toggle-slider" />
                  </label>
                </div>

                {notifications.dailyReminder && (
                  <div className="settings-input-wrapper" style={{ marginTop: 12 }}>
                    <label className="input-label">Время напоминания</label>
                    <input
                      type="time"
                      className="settings-input"
                      value={notifications.dailyReminderTime}
                      onChange={(e) => onUpdateNotifications({ dailyReminderTime: e.target.value })}
                    />
                  </div>
                )}

                <div
                  className="notif-row"
                  style={{ marginTop: notifications.dailyReminder ? 4 : 0 }}
                >
                  <div>
                    <div className="notif-row-title">Нарушение цели</div>
                    <div className="notif-row-hint">Уведомление при курении вне правил цели</div>
                  </div>
                  <label className="goal-toggle">
                    <input
                      type="checkbox"
                      checked={notifications.goalAlerts}
                      onChange={(e) => onUpdateNotifications({ goalAlerts: e.target.checked })}
                    />
                    <span className="goal-toggle-slider" />
                  </label>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
