export const HABIT_STATUS = {
  FOCUS: 'focus',
  MAINTENANCE: 'maintenance',
  ARCHIVED: 'archived',
}

export const HABIT_OUTCOME = {
  REPLACEMENT: 'replacement',
  OLD_BEHAVIOR: 'old_behavior',
}

export const HABIT_STATUS_META = {
  [HABIT_STATUS.FOCUS]: {
    tabLabel: 'В фокусе',
    sectionTitle: 'Формируется сейчас',
  },
  [HABIT_STATUS.MAINTENANCE]: {
    tabLabel: 'В поддержании',
    sectionTitle: 'Закреплённые привычки',
  },
  [HABIT_STATUS.ARCHIVED]: {
    tabLabel: 'Архив',
    sectionTitle: 'Архив привычек',
  },
}
