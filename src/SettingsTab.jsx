/** Вкладка настроек: стоимость пачки, количество сигарет в пачке, час начала дня. */
export default function SettingsTab({
  settingsPackPrice,
  setSettingsPackPrice,
  settingsCigarettesPerPack,
  setSettingsCigarettesPerPack,
  settingsDayStartHour,
  setSettingsDayStartHour,
  onSave,
}) {
  return (
    <div className="stats-card">
      <h2 style={{ marginBottom: 20 }}>Настройки</h2>

      <div className="settings-section">
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
    </div>
  )
}
