import { useState, useEffect, useCallback } from 'react'
import { useToast } from './hooks/useToast.js'
import GoalModal from './GoalModal'
import HomeTab from './HomeTab.jsx'
import JournalTab from './JournalTab.jsx'
import StatsTab from './StatsTab.jsx'
import GoalsTab from './GoalsTab.jsx'
import SettingsTab from './SettingsTab.jsx'
import AddCigaretteModal from './AddCigaretteModal.jsx'
import EditCigaretteModal from './EditCigaretteModal.jsx'
import QuickTagPanel from './QuickTagPanel.jsx'
import HabitsTab from './HabitsTab.jsx'
import HabitFormSheet from './HabitFormSheet.jsx'
import HabitActionsSheet from './HabitActionsSheet.jsx'
import HabitOutcomeSheet from './HabitOutcomeSheet.jsx'
import ConfettiBurst from './ConfettiBurst.jsx'
import { CONFETTI_VISIBLE_DURATION_MS } from './habitOutcomeMotion.js'
import { GOAL_TYPES, getGoalCategory } from './goalTypes.js'
import { HABIT_STATUS } from './habitTypes.js'
import {
  addFocusedHabit,
  addHabitEvent,
  changeHabitStatus,
  createHabit,
  updateHabit,
} from './habitUtils.js'
import {
  loadData,
  saveData,
  setDayStartHour,
  getDateKey,
  getTodaySmokedCount,
  DEFAULT_TAGS,
} from './utils.js'
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
  const [addTag, setAddTag] = useState('')
  const [settingsPackPrice, setSettingsPackPrice] = useState(data.packPrice?.toString() || '')
  const [settingsCigarettesPerPack, setSettingsCigarettesPerPack] = useState(
    data.cigarettesPerPack?.toString() || '20'
  )
  const [settingsDayStartHour, setSettingsDayStartHour] = useState(
    (data.dayStartHour ?? 0).toString()
  )
  const [openSwipeIndex, setOpenSwipeIndex] = useState(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [goalForm, setGoalForm] = useState({
    category: 'rule',
    type: 'silence',
    from: '22:00',
    to: '08:00',
    beforeTime: '11:00',
    maxCount: '1',
    count: '3',
    intervalMinutes: '30',
    afterTime: '20:00',
    title: '',
  })
  const [openGoalSwipeId, setOpenGoalSwipeId] = useState(null)
  const [quickTagTimestamp, setQuickTagTimestamp] = useState(null)
  const [showHabitForm, setShowHabitForm] = useState(false)
  const [editingHabitId, setEditingHabitId] = useState(null)
  const [habitActionsId, setHabitActionsId] = useState(null)
  const [habitOutcomeId, setHabitOutcomeId] = useState(null)
  const [habitCelebration, setHabitCelebration] = useState(null)
  const { toast, showToast, hideToast } = useToast()
  const [timeSinceLast, setTimeSinceLast] = useState(0)

  useEffect(() => {
    const lastCigarette = data.cigarettes[data.cigarettes.length - 1]
    if (!lastCigarette) return
    const interval = setInterval(() => setTimeSinceLast(Date.now() - lastCigarette), 1000)
    return () => clearInterval(interval)
  }, [data.cigarettes])

  useEffect(() => {
    if (!data.goals?.length) return
    const interval = setInterval(() => setTimeSinceLast((t) => t), 30000)
    return () => clearInterval(interval)
  }, [data.goals?.length])

  useEffect(() => {
    saveData(data)
  }, [data])
  useEffect(() => {
    setDayStartHour(data.dayStartHour)
  }, [data.dayStartHour])

  useEffect(() => {
    if (!habitCelebration) return undefined
    const timeout = window.setTimeout(() => setHabitCelebration(null), CONFETTI_VISIBLE_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [habitCelebration])

  const startHabitCelebration = useCallback((origin) => {
    setHabitCelebration({ ...origin, id: Date.now() })
  }, [])

  const addCigarette = useCallback(
    (amount = 1) => {
      const now = Date.now()
      setData((prev) => {
        if (prev.goals?.length) {
          const todayKey = getDateKey(now)
          const todayCigs = prev.cigarettes.filter((t) => getDateKey(t) === todayKey)
          const violated = prev.goals
            .filter((g) => g.enabled)
            .filter((g) => checkGoalViolationOnAdd(g, todayCigs, now))
          if (violated.length > 0) {
            const names = violated.map((g) => GOAL_TYPES[g.type]?.name || g.type).join(', ')
            setTimeout(() => showToast(`Нарушает цель: ${names}`), 0)
          }
        }
        return {
          ...prev,
          cigarettes: [...prev.cigarettes, now],
          cigaretteAmounts:
            amount === 1
              ? prev.cigaretteAmounts || {}
              : { ...(prev.cigaretteAmounts || {}), [now]: amount },
        }
      })
      setQuickTagTimestamp(now)
    },
    [showToast]
  )

  const selectQuickTag = useCallback(
    (tag) => {
      setData((prev) => {
        const cigaretteTags = { ...(prev.cigaretteTags || {}) }
        if (cigaretteTags[quickTagTimestamp] === tag) delete cigaretteTags[quickTagTimestamp]
        else cigaretteTags[quickTagTimestamp] = tag
        return { ...prev, cigaretteTags }
      })
      setQuickTagTimestamp(null)
    },
    [quickTagTimestamp]
  )

  const addQuickCustomTag = useCallback(
    (name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setData((prev) => {
        const existing = prev.customTags || []
        const customTags =
          existing.includes(trimmed) || DEFAULT_TAGS.includes(trimmed)
            ? existing
            : [...existing, trimmed]
        return {
          ...prev,
          customTags,
          hiddenTags: DEFAULT_TAGS.includes(trimmed)
            ? (prev.hiddenTags || []).filter((tag) => tag !== trimmed)
            : prev.hiddenTags || [],
          cigaretteTags: { ...(prev.cigaretteTags || {}), [quickTagTimestamp]: trimmed },
        }
      })
      setQuickTagTimestamp(null)
    },
    [quickTagTimestamp]
  )

  const undoQuickCigarette = useCallback(() => {
    setData((prev) => {
      const cigarettes = [...prev.cigarettes]
      const index = cigarettes.lastIndexOf(quickTagTimestamp)
      if (index !== -1) cigarettes.splice(index, 1)
      const cigaretteTags = { ...(prev.cigaretteTags || {}) }
      delete cigaretteTags[quickTagTimestamp]
      const cigaretteAmounts = { ...(prev.cigaretteAmounts || {}) }
      delete cigaretteAmounts[quickTagTimestamp]
      return { ...prev, cigarettes, cigaretteTags, cigaretteAmounts }
    })
    setQuickTagTimestamp(null)
    showToast('Добавление отменено')
  }, [quickTagTimestamp, showToast])

  const closeQuickTag = useCallback(() => {
    setQuickTagTimestamp(null)
  }, [])

  const deleteQuickTag = useCallback(
    (tag) => {
      const isDefault = DEFAULT_TAGS.includes(tag)
      setData((prev) => ({
        ...prev,
        ...(isDefault
          ? { hiddenTags: [...new Set([...(prev.hiddenTags || []), tag])] }
          : { customTags: (prev.customTags || []).filter((item) => item !== tag) }),
      }))
      showToast('Тег удалён', {
        label: 'Отменить',
        onClick: () => {
          setData((prev) => ({
            ...prev,
            ...(isDefault
              ? { hiddenTags: (prev.hiddenTags || []).filter((item) => item !== tag) }
              : {
                  customTags: (prev.customTags || []).includes(tag)
                    ? prev.customTags
                    : [...(prev.customTags || []), tag],
                }),
          }))
        },
      })
    },
    [showToast]
  )

  const startEditing = useCallback((timestamp, index) => {
    const date = new Date(timestamp)
    setEditHours(date.getHours().toString().padStart(2, '0'))
    setEditMinutes(date.getMinutes().toString().padStart(2, '0'))
    setEditingIndex(index)
  }, [])

  const saveEditedTime = useCallback(() => {
    if (editingIndex === null) return
    const previousTimestamp = data.cigarettes[editingIndex]
    const date = new Date(previousTimestamp)
    date.setHours(parseInt(editHours, 10) || 0, parseInt(editMinutes, 10) || 0, 0, 0)
    const nextTimestamp = date.getTime()
    setData((prev) => {
      const cigaretteTags = { ...(prev.cigaretteTags || {}) }
      const tag = cigaretteTags[previousTimestamp]
      delete cigaretteTags[previousTimestamp]
      if (tag) cigaretteTags[nextTimestamp] = tag
      const cigaretteAmounts = { ...(prev.cigaretteAmounts || {}) }
      const amount = cigaretteAmounts[previousTimestamp]
      delete cigaretteAmounts[previousTimestamp]
      if (amount) cigaretteAmounts[nextTimestamp] = amount
      return {
        ...prev,
        cigarettes: prev.cigarettes
          .map((timestamp, index) => (index === editingIndex ? nextTimestamp : timestamp))
          .sort((left, right) => left - right),
        cigaretteTags,
        cigaretteAmounts,
      }
    })
    setEditingIndex(null)
    setEditHours('')
    setEditMinutes('')
  }, [editingIndex, editHours, editMinutes, data.cigarettes])

  const cancelEditing = useCallback(() => {
    setEditingIndex(null)
    setEditHours('')
    setEditMinutes('')
  }, [])

  const deleteCigarette = useCallback(() => {
    if (editingIndex === null) return
    setData((prev) => {
      const deletedTimestamp = prev.cigarettes[editingIndex]
      const cigaretteTags = { ...(prev.cigaretteTags || {}) }
      delete cigaretteTags[deletedTimestamp]
      const cigaretteAmounts = { ...(prev.cigaretteAmounts || {}) }
      delete cigaretteAmounts[deletedTimestamp]
      return {
        ...prev,
        cigarettes: prev.cigarettes.filter((_, index) => index !== editingIndex),
        cigaretteTags,
        cigaretteAmounts,
      }
    })
    setEditingIndex(null)
    setEditHours('')
    setEditMinutes('')
  }, [editingIndex])

  const deleteCigaretteByIndex = useCallback((index) => {
    setData((prev) => {
      const deletedTimestamp = prev.cigarettes[index]
      const cigaretteTags = { ...(prev.cigaretteTags || {}) }
      delete cigaretteTags[deletedTimestamp]
      const cigaretteAmounts = { ...(prev.cigaretteAmounts || {}) }
      delete cigaretteAmounts[deletedTimestamp]
      return {
        ...prev,
        cigarettes: prev.cigarettes.filter((_, cigaretteIndex) => cigaretteIndex !== index),
        cigaretteTags,
        cigaretteAmounts,
      }
    })
    setOpenSwipeIndex(null)
  }, [])

  const openAddModal = useCallback(() => {
    const now = new Date()
    setAddDate(getDateKey(now.getTime()))
    setAddHours(now.getHours().toString().padStart(2, '0'))
    setAddMinutes(now.getMinutes().toString().padStart(2, '0'))
    setAddTag('')
    setShowAddModal(true)
  }, [])

  const closeAddModal = useCallback(() => {
    setShowAddModal(false)
    setAddDate('')
    setAddHours('')
    setAddMinutes('')
    setAddTag('')
  }, [])

  const addCustomTag = useCallback((name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setData((prev) => {
      const existing = prev.customTags || []
      const isDefault = DEFAULT_TAGS.includes(trimmed)
      if (existing.includes(trimmed) && !isDefault) return prev
      return {
        ...prev,
        customTags: isDefault ? existing : [...existing, trimmed],
        hiddenTags: isDefault
          ? (prev.hiddenTags || []).filter((tag) => tag !== trimmed)
          : prev.hiddenTags || [],
      }
    })
    setAddTag(trimmed)
  }, [])

  const saveManualCigarette = useCallback(() => {
    const date = new Date(addDate)
    date.setHours(parseInt(addHours, 10) || 0, parseInt(addMinutes, 10) || 0, 0, 0)
    const time = date.getTime()
    setData((prev) => ({
      ...prev,
      cigarettes: [...prev.cigarettes, time].sort((a, b) => a - b),
      ...(addTag ? { cigaretteTags: { ...(prev.cigaretteTags || {}), [time]: addTag } } : {}),
    }))
    closeAddModal()
  }, [addDate, addHours, addMinutes, addTag, closeAddModal])

  const saveSettings = useCallback(() => {
    setData((prev) => ({
      ...prev,
      packPrice: parseFloat(settingsPackPrice) || 0,
      cigarettesPerPack: parseInt(settingsCigarettesPerPack, 10) || 20,
      dayStartHour: Math.max(0, Math.min(12, parseInt(settingsDayStartHour, 10) || 0)),
    }))
  }, [settingsPackPrice, settingsCigarettesPerPack, settingsDayStartHour])

  const openCreateGoal = useCallback((category = 'rule') => {
    setEditingGoalId(null)
    setGoalForm({
      category,
      type: category === 'promise' ? 'custom' : 'silence',
      from: '22:00',
      to: '08:00',
      beforeTime: '11:00',
      maxCount: '1',
      count: '3',
      intervalMinutes: '30',
      afterTime: '20:00',
      title: '',
    })
    setShowGoalModal(true)
  }, [])

  const openEditGoal = useCallback((goal) => {
    setEditingGoalId(goal.id)
    setGoalForm({
      category: getGoalCategory(goal),
      type: goal.type,
      from: goal.params.from || '22:00',
      to: goal.params.to || '08:00',
      beforeTime: goal.params.beforeTime || '11:00',
      maxCount: goal.params.maxCount?.toString() || '1',
      count: goal.params.count?.toString() || '3',
      intervalMinutes: goal.params.intervalMinutes?.toString() || '30',
      afterTime: goal.params.afterTime || '20:00',
      title: goal.params.title || '',
    })
    setShowGoalModal(true)
    setOpenGoalSwipeId(null)
  }, [])

  const saveGoal = useCallback(() => {
    let params = {}
    if (goalForm.type === 'silence') params = { from: goalForm.from, to: goalForm.to }
    else if (goalForm.type === 'limit_before')
      params = { beforeTime: goalForm.beforeTime, maxCount: parseInt(goalForm.maxCount, 10) || 1 }
    else if (goalForm.type === 'morning_interval')
      params = {
        count: parseInt(goalForm.count, 10) || 3,
        intervalMinutes: parseInt(goalForm.intervalMinutes, 10) || 30,
      }
    else if (goalForm.type === 'evening_interval')
      params = {
        afterTime: goalForm.afterTime,
        intervalMinutes: parseInt(goalForm.intervalMinutes, 10) || 30,
      }
    else if (goalForm.type === 'custom') params = { title: goalForm.title.trim() }
    setData((prev) => {
      const goals = prev.goals || []
      const nextGoals = editingGoalId
        ? goals.map((g) => (g.id === editingGoalId ? { ...g, type: goalForm.type, params } : g))
        : [
            ...goals,
            {
              id: generateGoalId(),
              type: goalForm.type,
              enabled: true,
              params,
              createdAt: Date.now(),
              ...(goalForm.category === 'promise' ? { completedDates: [] } : {}),
            },
          ]
      return { ...prev, goals: nextGoals }
    })
    setShowGoalModal(false)
    setEditingGoalId(null)
  }, [goalForm, editingGoalId])

  const deleteGoal = useCallback((goalId) => {
    setData((prev) => ({ ...prev, goals: (prev.goals || []).filter((g) => g.id !== goalId) }))
    setOpenGoalSwipeId(null)
  }, [])

  const toggleGoalEnabled = useCallback((goalId) => {
    setData((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => (g.id === goalId ? { ...g, enabled: !g.enabled } : g)),
    }))
  }, [])

  const toggleGoalCompletion = useCallback(
    (goalId) => {
      const todayKey = getDateKey(Date.now())
      let markedDone = false
      setData((prev) => ({
        ...prev,
        goals: (prev.goals || []).map((g) => {
          if (g.id !== goalId || getGoalCategory(g) !== 'promise') return g
          const dates = g.completedDates || []
          const done = dates.includes(todayKey)
          markedDone = !done
          return {
            ...g,
            completedDates: done ? dates.filter((d) => d !== todayKey) : [...dates, todayKey],
          }
        }),
      }))
      setTimeout(() => showToast(markedDone ? 'Обещание выполнено' : 'Отметка снята'), 0)
    },
    [showToast]
  )

  const openCreateHabit = useCallback(() => {
    setEditingHabitId(null)
    setShowHabitForm(true)
  }, [])

  const openEditHabit = useCallback((habitId) => {
    setEditingHabitId(habitId)
    setHabitActionsId(null)
    setShowHabitForm(true)
  }, [])

  const closeHabitForm = useCallback(() => {
    setShowHabitForm(false)
    setEditingHabitId(null)
  }, [])

  const saveHabit = useCallback(
    (form) => {
      setData((prev) => {
        const habits = prev.habits || []
        if (editingHabitId) {
          return { ...prev, habits: updateHabit(habits, editingHabitId, form) }
        }
        const habit = createHabit(form)
        return { ...prev, habits: addFocusedHabit(habits, habit) }
      })
      closeHabitForm()
      showToast(editingHabitId ? 'Привычка обновлена' : 'Привычка создана')
    },
    [closeHabitForm, editingHabitId, showToast]
  )

  const moveHabit = useCallback(
    (habitId, nextStatus) => {
      setData((prev) => ({
        ...prev,
        habits: changeHabitStatus(prev.habits || [], habitId, nextStatus),
      }))
      setHabitActionsId(null)
      const messages = {
        [HABIT_STATUS.FOCUS]: 'Привычка теперь в фокусе',
        [HABIT_STATUS.MAINTENANCE]: 'Привычка переведена в поддержание',
        [HABIT_STATUS.ARCHIVED]: 'Привычка перемещена в архив',
      }
      showToast(messages[nextStatus])
    },
    [showToast]
  )

  const deleteHabit = useCallback(
    (habitId) => {
      setData((prev) => ({
        ...prev,
        habits: (prev.habits || []).filter((habit) => habit.id !== habitId),
      }))
      setHabitActionsId(null)
      showToast('Привычка удалена')
    },
    [showToast]
  )

  const recordHabitOutcome = useCallback(
    (habitId, outcome) => {
      setData((prev) => ({
        ...prev,
        habits: addHabitEvent(prev.habits || [], habitId, outcome),
      }))
      setHabitOutcomeId(null)
      showToast(outcome === 'replacement' ? 'Новая привычка укреплена' : 'Ситуация отмечена')
    },
    [showToast]
  )

  const todayKey = getDateKey(Date.now())
  const todayCigarettes = data.cigarettes
    .filter((t) => getDateKey(t) === todayKey)
    .sort((a, b) => b - a)
  const todaySmoked = getTodaySmokedCount(data.cigarettes, data.cigaretteAmounts)
  const editingHabit = (data.habits || []).find((habit) => habit.id === editingHabitId)
  const actionHabit = (data.habits || []).find((habit) => habit.id === habitActionsId)
  const outcomeHabit = (data.habits || []).find((habit) => habit.id === habitOutcomeId)
  const habitTriggerSuggestions = [
    ...new Set([
      ...DEFAULT_TAGS,
      ...(data.customTags || []),
      ...(data.habits || []).map((habit) => habit.trigger),
    ]),
  ].filter(Boolean)

  return (
    <div className="app">
      {activeTab === 'home' && (
        <HomeTab
          data={data}
          timeSinceLast={timeSinceLast}
          todayCigarettes={todayCigarettes}
          todaySmoked={todaySmoked}
          onAddCigarette={addCigarette}
          onSetActiveTab={setActiveTab}
          onToggleGoalCompletion={toggleGoalCompletion}
          onOpenHabits={() => setActiveTab('habits')}
          onCreateHabit={openCreateHabit}
          onHabitSituation={setHabitOutcomeId}
        />
      )}

      {activeTab === 'habits' && (
        <HabitsTab
          habits={data.habits || []}
          onCreate={openCreateHabit}
          onOpenActions={setHabitActionsId}
          onSituation={setHabitOutcomeId}
        />
      )}

      {activeTab === 'journal' && (
        <JournalTab
          data={data}
          onOpenAddModal={openAddModal}
          onStartEditing={startEditing}
          onDeleteByIndex={deleteCigaretteByIndex}
        />
      )}

      {activeTab === 'stats' && (
        <StatsTab
          data={data}
          statsPeriod={statsPeriod}
          setStatsPeriod={setStatsPeriod}
          selectedDay={selectedDay}
          setSelectedDay={setSelectedDay}
          openSwipeIndex={openSwipeIndex}
          setOpenSwipeIndex={setOpenSwipeIndex}
          onStartEditing={startEditing}
          onDeleteByIndex={deleteCigaretteByIndex}
        />
      )}

      {activeTab === 'goals' && (
        <GoalsTab
          data={data}
          todayCigarettes={todayCigarettes}
          openGoalSwipeId={openGoalSwipeId}
          setOpenGoalSwipeId={setOpenGoalSwipeId}
          onCreateGoal={openCreateGoal}
          onEditGoal={openEditGoal}
          onDeleteGoal={deleteGoal}
          onToggleGoal={toggleGoalEnabled}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          settingsPackPrice={settingsPackPrice}
          setSettingsPackPrice={setSettingsPackPrice}
          settingsCigarettesPerPack={settingsCigarettesPerPack}
          setSettingsCigarettesPerPack={setSettingsCigarettesPerPack}
          settingsDayStartHour={settingsDayStartHour}
          setSettingsDayStartHour={setSettingsDayStartHour}
          onSave={saveSettings}
        />
      )}

      {showGoalModal && (
        <GoalModal
          editingGoalId={editingGoalId}
          goalForm={goalForm}
          setGoalForm={setGoalForm}
          onSave={saveGoal}
          onDelete={deleteGoal}
          onClose={() => {
            setShowGoalModal(false)
            setEditingGoalId(null)
          }}
        />
      )}

      {showAddModal && (
        <AddCigaretteModal
          addDate={addDate}
          setAddDate={setAddDate}
          addHours={addHours}
          setAddHours={setAddHours}
          addMinutes={addMinutes}
          setAddMinutes={setAddMinutes}
          customTags={data.customTags || []}
          hiddenTags={data.hiddenTags || []}
          selectedTag={addTag}
          setSelectedTag={setAddTag}
          onAddCustomTag={addCustomTag}
          onDeleteTag={deleteQuickTag}
          onSave={saveManualCigarette}
          onClose={closeAddModal}
        />
      )}

      {editingIndex !== null && (
        <EditCigaretteModal
          editHours={editHours}
          setEditHours={setEditHours}
          editMinutes={editMinutes}
          setEditMinutes={setEditMinutes}
          onSave={saveEditedTime}
          onDelete={deleteCigarette}
          onClose={cancelEditing}
        />
      )}

      {quickTagTimestamp !== null && (
        <QuickTagPanel
          key={quickTagTimestamp}
          timestamp={quickTagTimestamp}
          amount={data.cigaretteAmounts?.[quickTagTimestamp] || 1}
          tags={[
            ...DEFAULT_TAGS.filter((tag) => !(data.hiddenTags || []).includes(tag)),
            ...(data.customTags || []),
          ]}
          selectedTag={(data.cigaretteTags || {})[quickTagTimestamp] || ''}
          onSelectTag={selectQuickTag}
          onAddCustomTag={addQuickCustomTag}
          onDeleteTag={deleteQuickTag}
          onUndo={undoQuickCigarette}
          onClose={closeQuickTag}
        />
      )}

      {showHabitForm && (
        <HabitFormSheet
          habit={editingHabit}
          suggestions={habitTriggerSuggestions}
          onSave={saveHabit}
          onClose={closeHabitForm}
        />
      )}

      {actionHabit && (
        <HabitActionsSheet
          habit={actionHabit}
          onChangeStatus={(nextStatus) => moveHabit(actionHabit.id, nextStatus)}
          onEdit={() => openEditHabit(actionHabit.id)}
          onDelete={() => deleteHabit(actionHabit.id)}
          onClose={() => setHabitActionsId(null)}
        />
      )}

      {outcomeHabit && (
        <HabitOutcomeSheet
          habit={outcomeHabit}
          onSelect={(outcome) => recordHabitOutcome(outcomeHabit.id, outcome)}
          onCelebrate={startHabitCelebration}
          onClose={() => setHabitOutcomeId(null)}
        />
      )}

      {habitCelebration && <ConfettiBurst key={habitCelebration.id} origin={habitCelebration} />}

      <nav className="nav">
        <button
          className={`nav-item ${['home', 'habits'].includes(activeTab) ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path
                d="m3 9.5 9-7 9 7V20a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-7v6h-4A1.5 1.5 0 0 1 3 20z"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          Главная
        </button>
        <button
          className={`nav-item ${activeTab === 'journal' ? 'active' : ''}`}
          onClick={() => setActiveTab('journal')}
        >
          <span className="nav-icon nav-icon-journal" aria-hidden="true">
            <span className="nav-journal-document">
              <span />
              <span />
              <span />
            </span>
          </span>
          Журнал
        </button>
        <button
          className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="nav-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <line x1="6" y1="20" x2="6" y2="13" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="18" y1="20" x2="18" y2="9" />
            </svg>
          </span>
          Статистика
        </button>
        <button
          className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="4.5" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
          </span>
          Цели
        </button>
        <button
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <span className="nav-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          Настройки
        </button>
      </nav>

      {toast && (
        <div className="toast">
          <span>{toast.message}</span>
          {toast.action && (
            <button
              className="toast-action"
              type="button"
              onClick={() => {
                toast.action.onClick()
                hideToast()
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
