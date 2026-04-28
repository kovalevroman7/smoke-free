import { useState, useEffect, useCallback, useRef } from 'react'
import GoalModal from './GoalModal'
import HomeTab from './HomeTab.jsx'
import StatsTab from './StatsTab.jsx'
import GoalsTab from './GoalsTab.jsx'
import SettingsTab from './SettingsTab.jsx'
import AddCigaretteModal from './AddCigaretteModal.jsx'
import EditCigaretteModal from './EditCigaretteModal.jsx'
import { GOAL_TYPES } from './goalTypes.js'
import { loadData, saveData, setDayStartHour, getDateKey, getTodaySmokedCount } from './utils.js'
import { generateGoalId, checkGoalViolationOnAdd } from './goalUtils.js'

/** Корневой компонент: управляет состоянием, роутингом по вкладкам и модальными окнами. */
export default function App() {
  const [data, setData] = useState(loadData)
  const [activeTab, setActiveTab] = useState('home')
  const [statsPeriod, setStatsPeriod] = useState('week')
  const [selectedDay, setSelectedDay] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [editHours, setEditHours] = useState('')
  const [editMinutes, setEditMinutes] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDate, setAddDate] = useState('')
  const [addHours, setAddHours] = useState('')
  const [addMinutes, setAddMinutes] = useState('')
  const [settingsPackPrice, setSettingsPackPrice] = useState(data.packPrice?.toString() || '')
  const [settingsCigarettesPerPack, setSettingsCigarettesPerPack] = useState(data.cigarettesPerPack?.toString() || '20')
  const [settingsDayStartHour, setSettingsDayStartHour] = useState((data.dayStartHour ?? 0).toString())
  const [openSwipeIndex, setOpenSwipeIndex] = useState(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [goalForm, setGoalForm] = useState({
    type: 'silence', from: '22:00', to: '08:00',
    beforeTime: '11:00', maxCount: '1',
    count: '3', intervalMinutes: '30', afterTime: '20:00'
  })
  const [openGoalSwipeId, setOpenGoalSwipeId] = useState(null)
  const [showAllLog, setShowAllLog] = useState(false)
  const [toast, setToast] = useState(null)
  const [timeSinceLast, setTimeSinceLast] = useState(0)
  const toastTimerRef = useRef(null)

  const showToast = useCallback((message) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  useEffect(() => {
    const lastCigarette = data.cigarettes[data.cigarettes.length - 1]
    if (!lastCigarette) return
    const interval = setInterval(() => setTimeSinceLast(Date.now() - lastCigarette), 1000)
    return () => clearInterval(interval)
  }, [data.cigarettes])

  useEffect(() => {
    if (!data.goals?.length) return
    const interval = setInterval(() => setTimeSinceLast(t => t), 30000)
    return () => clearInterval(interval)
  }, [data.goals?.length])

  useEffect(() => { saveData(data) }, [data])
  useEffect(() => { setDayStartHour(data.dayStartHour) }, [data.dayStartHour])

  const addCigarette = useCallback(() => {
    const now = Date.now()
    setData(prev => {
      if (prev.goals?.length) {
        const todayKey = getDateKey(now)
        const todayCigs = prev.cigarettes.filter(t => getDateKey(t) === todayKey)
        const violated = prev.goals.filter(g => g.enabled).filter(g => checkGoalViolationOnAdd(g, todayCigs, now))
        if (violated.length > 0) {
          const names = violated.map(g => GOAL_TYPES[g.type]?.name || g.type).join(', ')
          setTimeout(() => showToast(`Нарушает цель: ${names}`), 0)
        }
      }
      return { ...prev, cigarettes: [...prev.cigarettes, now] }
    })
  }, [showToast])

  const startEditing = useCallback((timestamp, index) => {
    const date = new Date(timestamp)
    setEditHours(date.getHours().toString().padStart(2, '0'))
    setEditMinutes(date.getMinutes().toString().padStart(2, '0'))
    setEditingIndex(index)
  }, [])

  const saveEditedTime = useCallback(() => {
    if (editingIndex === null) return
    const date = new Date(data.cigarettes[editingIndex])
    date.setHours(parseInt(editHours, 10) || 0, parseInt(editMinutes, 10) || 0, 0, 0)
    setData(prev => ({
      ...prev,
      cigarettes: prev.cigarettes.map((t, i) => i === editingIndex ? date.getTime() : t)
    }))
    setEditingIndex(null); setEditHours(''); setEditMinutes('')
  }, [editingIndex, editHours, editMinutes, data.cigarettes])

  const cancelEditing = useCallback(() => {
    setEditingIndex(null); setEditHours(''); setEditMinutes('')
  }, [])

  const deleteCigarette = useCallback(() => {
    if (editingIndex === null) return
    setData(prev => ({ ...prev, cigarettes: prev.cigarettes.filter((_, i) => i !== editingIndex) }))
    setEditingIndex(null); setEditHours(''); setEditMinutes('')
  }, [editingIndex])

  const deleteCigaretteByIndex = useCallback((index) => {
    setData(prev => ({ ...prev, cigarettes: prev.cigarettes.filter((_, i) => i !== index) }))
    setOpenSwipeIndex(null)
  }, [])

  const openAddModal = useCallback(() => {
    const now = new Date()
    setAddDate(getDateKey(now.getTime()))
    setAddHours(now.getHours().toString().padStart(2, '0'))
    setAddMinutes(now.getMinutes().toString().padStart(2, '0'))
    setShowAddModal(true)
  }, [])

  const closeAddModal = useCallback(() => {
    setShowAddModal(false); setAddDate(''); setAddHours(''); setAddMinutes('')
  }, [])

  const saveManualCigarette = useCallback(() => {
    const date = new Date(addDate)
    date.setHours(parseInt(addHours, 10) || 0, parseInt(addMinutes, 10) || 0, 0, 0)
    setData(prev => ({
      ...prev,
      cigarettes: [...prev.cigarettes, date.getTime()].sort((a, b) => a - b)
    }))
    closeAddModal()
  }, [addDate, addHours, addMinutes, closeAddModal])

  const saveSettings = useCallback(() => {
    setData(prev => ({
      ...prev,
      packPrice: parseFloat(settingsPackPrice) || 0,
      cigarettesPerPack: parseInt(settingsCigarettesPerPack, 10) || 20,
      dayStartHour: Math.max(0, Math.min(12, parseInt(settingsDayStartHour, 10) || 0))
    }))
  }, [settingsPackPrice, settingsCigarettesPerPack, settingsDayStartHour])

  const openCreateGoal = useCallback(() => {
    setEditingGoalId(null)
    setGoalForm({ type: 'silence', from: '22:00', to: '08:00', beforeTime: '11:00', maxCount: '1', count: '3', intervalMinutes: '30', afterTime: '20:00' })
    setShowGoalModal(true)
  }, [])

  const openEditGoal = useCallback((goal) => {
    setEditingGoalId(goal.id)
    setGoalForm({
      type: goal.type,
      from: goal.params.from || '22:00', to: goal.params.to || '08:00',
      beforeTime: goal.params.beforeTime || '11:00',
      maxCount: goal.params.maxCount?.toString() || '1',
      count: goal.params.count?.toString() || '3',
      intervalMinutes: goal.params.intervalMinutes?.toString() || '30',
      afterTime: goal.params.afterTime || '20:00'
    })
    setShowGoalModal(true)
    setOpenGoalSwipeId(null)
  }, [])

  const saveGoal = useCallback(() => {
    let params = {}
    if (goalForm.type === 'silence') params = { from: goalForm.from, to: goalForm.to }
    else if (goalForm.type === 'limit_before') params = { beforeTime: goalForm.beforeTime, maxCount: parseInt(goalForm.maxCount, 10) || 1 }
    else if (goalForm.type === 'morning_interval') params = { count: parseInt(goalForm.count, 10) || 3, intervalMinutes: parseInt(goalForm.intervalMinutes, 10) || 30 }
    else if (goalForm.type === 'evening_interval') params = { afterTime: goalForm.afterTime, intervalMinutes: parseInt(goalForm.intervalMinutes, 10) || 30 }
    setData(prev => {
      const goals = prev.goals || []
      const nextGoals = editingGoalId
        ? goals.map(g => g.id === editingGoalId ? { ...g, type: goalForm.type, params } : g)
        : [...goals, { id: generateGoalId(), type: goalForm.type, enabled: true, params, createdAt: Date.now() }]
      return { ...prev, goals: nextGoals }
    })
    setShowGoalModal(false); setEditingGoalId(null)
  }, [goalForm, editingGoalId])

  const deleteGoal = useCallback((goalId) => {
    setData(prev => ({ ...prev, goals: (prev.goals || []).filter(g => g.id !== goalId) }))
    setOpenGoalSwipeId(null)
  }, [])

  const toggleGoalEnabled = useCallback((goalId) => {
    setData(prev => ({
      ...prev,
      goals: (prev.goals || []).map(g => g.id === goalId ? { ...g, enabled: !g.enabled } : g)
    }))
  }, [])

  const todayKey = getDateKey(Date.now())
  const todayCigarettes = data.cigarettes.filter(t => getDateKey(t) === todayKey).sort((a, b) => b - a)
  const todaySmoked = getTodaySmokedCount(data.cigarettes)

  return (
    <div className="app">
      {activeTab === 'home' && (
        <HomeTab
          data={data} timeSinceLast={timeSinceLast}
          todayCigarettes={todayCigarettes} todaySmoked={todaySmoked}
          showAllLog={showAllLog} setShowAllLog={setShowAllLog}
          onAddCigarette={addCigarette} onOpenAddModal={openAddModal}
          onOpenCreateGoal={openCreateGoal} onStartEditing={startEditing}
          onSetActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'stats' && (
        <StatsTab
          data={data} statsPeriod={statsPeriod} setStatsPeriod={setStatsPeriod}
          selectedDay={selectedDay} setSelectedDay={setSelectedDay}
          openSwipeIndex={openSwipeIndex} setOpenSwipeIndex={setOpenSwipeIndex}
          onStartEditing={startEditing} onDeleteByIndex={deleteCigaretteByIndex}
        />
      )}

      {activeTab === 'goals' && (
        <GoalsTab
          data={data} todayCigarettes={todayCigarettes}
          openGoalSwipeId={openGoalSwipeId} setOpenGoalSwipeId={setOpenGoalSwipeId}
          onCreateGoal={openCreateGoal} onEditGoal={openEditGoal}
          onDeleteGoal={deleteGoal} onToggleGoal={toggleGoalEnabled}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          settingsPackPrice={settingsPackPrice} setSettingsPackPrice={setSettingsPackPrice}
          settingsCigarettesPerPack={settingsCigarettesPerPack} setSettingsCigarettesPerPack={setSettingsCigarettesPerPack}
          settingsDayStartHour={settingsDayStartHour} setSettingsDayStartHour={setSettingsDayStartHour}
          onSave={saveSettings}
        />
      )}

      {showGoalModal && (
        <GoalModal
          editingGoalId={editingGoalId} goalForm={goalForm} setGoalForm={setGoalForm}
          onSave={saveGoal} onDelete={deleteGoal}
          onClose={() => { setShowGoalModal(false); setEditingGoalId(null) }}
        />
      )}

      {showAddModal && (
        <AddCigaretteModal
          addDate={addDate} setAddDate={setAddDate}
          addHours={addHours} setAddHours={setAddHours}
          addMinutes={addMinutes} setAddMinutes={setAddMinutes}
          onSave={saveManualCigarette} onClose={closeAddModal}
        />
      )}

      {editingIndex !== null && (
        <EditCigaretteModal
          editHours={editHours} setEditHours={setEditHours}
          editMinutes={editMinutes} setEditMinutes={setEditMinutes}
          onSave={saveEditedTime} onDelete={deleteCigarette} onClose={cancelEditing}
        />
      )}

      <nav className="nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <span className="nav-icon">🏠</span>Главная
        </button>
        <button className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <span className="nav-icon">📊</span>Статистика
        </button>
        <button className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
          <span className="nav-icon">🎯</span>Цели
        </button>
        <button className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <span className="nav-icon">⚙️</span>Настройки
        </button>
      </nav>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
